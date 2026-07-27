//! Windows-only WebView2 wiring: web `Notification` handling routed through
//! real Windows toasts, and password-autosave opt-in. Moved out of
//! `commands.rs` (which stays the OS-agnostic tab/window orchestration
//! layer) since these reach directly into WebView2/COM APIs.

use tauri::{AppHandle, Manager};

/// Wires up a tab's webview so its web `Notification`s actually work end to
/// end: auto-grants the permission (WebView2's own prompt UI only appears
/// for requests made from a genuine user gesture, and most sites — WhatsApp
/// Web included — request it eagerly on load, so the prompt never shows and
/// the site is left thinking the user silently denied it), then takes over
/// notification display entirely so a click on it can be routed back into
/// the app: WebView2's default handling shows the toast fine but gives the
/// host no way to learn it was clicked.
pub fn setup_web_notifications(app_handle: &AppHandle, data_slug: &str, app_id: &str, webview: &tauri::webview::Webview) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2_24, COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS, COREWEBVIEW2_PERMISSION_STATE_ALLOW,
    };
    use webview2_com::{NotificationReceivedEventHandler, PermissionRequestedEventHandler};
    use windows::core::Interface;

    let aumid = super::winid::aumid_for_slug("Silos.WebApp", data_slug);
    let app_handle = app_handle.clone();
    let app_id = app_id.to_string();

    let _ = webview.with_webview(move |pw| {
        let controller = pw.controller();
        unsafe {
            let Ok(core) = controller.CoreWebView2() else { return };

            let perm_handler = PermissionRequestedEventHandler::create(Box::new(|_sender, args| {
                if let Some(args) = args {
                    let mut kind = Default::default();
                    if args.PermissionKind(&mut kind).is_ok() && kind == COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS {
                        let _ = args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
                    }
                }
                Ok(())
            }));
            let mut perm_token: i64 = 0;
            let _ = core.add_PermissionRequested(&perm_handler, &mut perm_token);

            let Ok(core24) = core.cast::<ICoreWebView2_24>() else { return };
            let recv_handle = app_handle.clone();
            let recv_app_id = app_id.clone();
            let recv_aumid = aumid.clone();
            let recv_handler = NotificationReceivedEventHandler::create(Box::new(move |_sender, args| {
                let Some(args) = args else { return Ok(()) };
                args.SetHandled(true)?;
                let Ok(notification) = args.Notification() else { return Ok(()) };

                let title = read_pwstr(|out| notification.Title(out));
                let body = read_pwstr(|out| notification.Body(out));
                let icon = read_pwstr(|out| notification.IconUri(out));
                let _ = notification.ReportShown();

                let handle = recv_handle.clone();
                let app_id = recv_app_id.clone();
                let click_notification = SendableNotification(notification.clone());
                let shown = super::notifications::show_toast(
                    &recv_aumid,
                    &title,
                    &body,
                    Some(icon.as_str()).filter(|s| !s.is_empty()),
                    move || {
                        // The toast's Activated event fires on its own WinRT
                        // callback thread, not the main UI thread that owns
                        // this COM object and the app's windows — both are
                        // thread-affine on Windows, so everything reached
                        // from here has to be dispatched back to the main
                        // thread first (touching them directly from here
                        // took the whole process down).
                        let dispatch_handle = handle.clone();
                        let _ = handle.run_on_main_thread(move || {
                            click_notification.report_clicked();
                            focus_app_from_notification(&dispatch_handle, &app_id);
                        });
                    },
                );
                if shown.is_err() {
                    let _ = notification.ReportClosed();
                }
                Ok(())
            }));
            let mut recv_token: i64 = 0;
            let _ = core24.add_NotificationReceived(&recv_handler, &mut recv_token);
        }
    });
}

/// WebView2 ships with Edge's password manager, but `IsPasswordAutosaveEnabled`
/// defaults to false for embedding apps (an embedder has to opt in explicitly,
/// unlike Edge itself) — without this the "Save password?" prompt never
/// appears at all. General autofill (addresses/payment) is enabled alongside
/// it since it's controlled by the same settings interface.
pub fn setup_password_autosave(webview: &tauri::webview::Webview) {
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings4;
    use windows::core::Interface;

    let _ = webview.with_webview(move |pw| {
        let controller = pw.controller();
        unsafe {
            let Ok(core) = controller.CoreWebView2() else { return };
            let Ok(settings) = core.Settings() else { return };
            let Ok(settings4) = settings.cast::<ICoreWebView2Settings4>() else { return };
            let _ = settings4.SetIsPasswordAutosaveEnabled(true);
            let _ = settings4.SetIsGeneralAutofillEnabled(true);
        }
    });
}

struct SendableNotification(webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Notification);
unsafe impl Send for SendableNotification {}
impl SendableNotification {
    // A plain method call (rather than a `.0` field access) forces the
    // closure below to capture this whole newtype instead of reaching
    // through to the non-Send COM interface inside it (Rust 2021's
    // disjoint-capture rules would otherwise capture just the field).
    fn report_clicked(&self) {
        let _ = unsafe { self.0.ReportClicked() };
    }
}

unsafe fn read_pwstr(f: impl FnOnce(*mut windows::core::PWSTR) -> windows::core::Result<()>) -> String {
    let mut raw = windows::core::PWSTR::null();
    if f(&mut raw).is_err() || raw.is_null() {
        return String::new();
    }
    let s = raw.to_string().unwrap_or_default();
    windows::Win32::System::Com::CoTaskMemFree(Some(raw.as_ptr() as *const _));
    s
}

/// Brings a webapp's window to front after a notification click: restores it
/// through the same path a tray click would (handles the lock overlay if
/// it's re-locked), or opens it fresh if it isn't running at all right now.
/// Must already be running on the main thread — see the dispatch in
/// `setup_web_notifications`'s `on_activated` callback, which is the only
/// caller reached from a non-main thread.
fn focus_app_from_notification(app_handle: &AppHandle, app_id: &str) {
    if app_handle.get_window(&crate::layout::app_window_label(app_id)).is_some() {
        let _ = crate::commands::show_background_app(app_handle.clone(), app_id.to_string());
        return;
    }
    let handle = app_handle.clone();
    let id = app_id.to_string();
    tauri::async_runtime::spawn(async move {
        let _ = crate::commands::open_app(handle.clone(), handle.state(), handle.state(), handle.state(), id, None).await;
    });
}
