//! Native Windows toast notifications for web `Notification` API calls made
//! from a webapp's page (e.g. WhatsApp Web's new-message notifications).
//!
//! WebView2's own default notification handling shows the toast fine, but
//! gives the host no way to learn a notification was clicked (there's no
//! "clicked" event on that path) — clicking one just fires the page's own
//! `onclick`, which is useless if our window is hidden in the tray. So
//! `commands::setup_web_notifications` takes the notification over entirely
//! (`ICoreWebView2NotificationReceivedEventArgs::SetHandled(true)`) and this
//! module renders it as a real Windows toast that we control, wiring its
//! `Activated` event back to whatever the caller wants done (bring the
//! app's window to front).

use std::cell::RefCell;
use std::sync::{Mutex, OnceLock};
use windows::core::{Result, HSTRING};
use windows::Data::Xml::Dom::XmlDocument;
use windows::Foundation::TypedEventHandler;
use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

/// Toasts we've shown are kept alive here for as long as they might still be
/// clicked: dropping the `ToastNotification` object would tear down its
/// `Activated` subscription even though the toast keeps showing in Action
/// Center, silently breaking the click-to-focus behavior this exists for.
/// Removed by tag once activated/dismissed/failed; capped as a fallback.
fn pending_toasts() -> &'static Mutex<Vec<(String, ToastNotification)>> {
    static PENDING: OnceLock<Mutex<Vec<(String, ToastNotification)>>> = OnceLock::new();
    PENDING.get_or_init(|| Mutex::new(Vec::new()))
}

fn forget_toast(tag: &str) {
    pending_toasts().lock().unwrap().retain(|(t, _)| t != tag);
}

/// Shows a toast under the given AppUserModelID (must match a registered
/// Start Menu shortcut, see `shortcuts::create_shortcut`), calling
/// `on_activated` once if/when the user clicks it.
pub fn show_toast(
    aumid: &str,
    title: &str,
    body: &str,
    icon_uri: Option<&str>,
    on_activated: impl FnOnce() + Send + 'static,
) -> Result<()> {
    let tag = uuid::Uuid::new_v4().to_string();

    let xml = XmlDocument::new()?;
    xml.LoadXml(&HSTRING::from(build_toast_xml(title, body, icon_uri)))?;
    let toast = ToastNotification::CreateToastNotification(&xml)?;
    toast.SetTag(&HSTRING::from(&tag))?;

    let activated_tag = tag.clone();
    let callback = RefCell::new(Some(on_activated));
    toast.Activated(&TypedEventHandler::new(move |_sender, _args| {
        if let Some(cb) = callback.borrow_mut().take() {
            cb();
        }
        forget_toast(&activated_tag);
        Ok(())
    }))?;

    let dismissed_tag = tag.clone();
    toast.Dismissed(&TypedEventHandler::new(move |_sender, _args| {
        forget_toast(&dismissed_tag);
        Ok(())
    }))?;

    let failed_tag = tag.clone();
    toast.Failed(&TypedEventHandler::new(move |_sender, _args| {
        forget_toast(&failed_tag);
        Ok(())
    }))?;

    let notifier = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(aumid))?;

    {
        let mut pending = pending_toasts().lock().unwrap();
        pending.push((tag, toast.clone()));
        // Fallback cap in case some path never fires Activated/Dismissed/Failed.
        if pending.len() > 50 {
            pending.remove(0);
        }
    }

    notifier.Show(&toast)?;
    Ok(())
}

fn build_toast_xml(title: &str, body: &str, icon_uri: Option<&str>) -> String {
    let image = icon_uri
        .filter(|u| !u.is_empty())
        .map(|u| format!(r#"<image placement="appLogoOverride" hint-crop="circle" src="{}"/>"#, xml_escape(u)))
        .unwrap_or_default();
    format!(
        r#"<toast><visual><binding template="ToastGeneric"><text>{}</text><text>{}</text>{image}</binding></visual></toast>"#,
        xml_escape(title),
        xml_escape(body),
    )
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}
