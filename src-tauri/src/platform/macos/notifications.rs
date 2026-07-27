//! Native macOS notifications via the legacy `NSUserNotificationCenter`
//! (through the `mac-notification-sys` crate — Apple's replacement,
//! `UNUserNotificationCenter`, requires an app-extension-style delegate
//! registration that's a much bigger lift to wire from a plain Tauri/wry
//! host; revisit if `NSUserNotificationCenter` ever actually gets removed
//! rather than just deprecated).
//!
//! UNTESTED: no macOS machine available to verify. Re-check on first real
//! macOS run: does `send_notification` actually deliver anything when the
//! calling process isn't itself inside a proper signed `.app` bundle (the
//! portable exe launched directly, as opposed to via the `.app` stub
//! `platform::macos::shortcuts` creates) — `set_application` here best-
//! effort points at that stub bundle's identifier by name, but
//! `mac-notification-sys`'s docs flag unsigned/unbundled callers as
//! unreliable in general; and does the blocking `send_notification` call
//! actually return promptly on dismiss/timeout rather than hanging the
//! spawned thread indefinitely.

use std::sync::OnceLock;

/// `mac-notification-sys` needs `set_application` called once with a
/// registered bundle identifier before notifications can be attributed to
/// this app; looks up the `.app` stub `platform::macos::shortcuts` creates
/// (named "Silos") by name, falling back to the crate's own default
/// (Finder's bundle id) if that bundle isn't registered with Launch
/// Services yet — e.g. the dashboard-only case where no per-webapp shortcut
/// (and therefore no `.app`) has been created.
fn ensure_application_registered() {
    static REGISTERED: OnceLock<()> = OnceLock::new();
    REGISTERED.get_or_init(|| {
        let bundle_id = mac_notification_sys::get_bundle_identifier_or_default("Silos");
        let _ = mac_notification_sys::set_application(&bundle_id);
    });
}

/// Shows a notification, calling `on_activated` once if/when the user
/// clicks it. `send_notification` blocks the calling thread until the user
/// interacts with the notification or it times out/dismisses — unlike
/// Windows' event-driven `Activated` callback — so this runs on its own
/// thread rather than the caller's, to keep `show_toast` itself
/// non-blocking like its Windows/Linux counterparts.
///
/// `icon_uri` is unused: `mac-notification-sys`'s notification options
/// don't take an arbitrary image URL/path the way the Windows toast XML or
/// Linux's `Hint`-based icon do, only the calling app's own bundle icon.
pub fn show_toast(
    _aumid: &str,
    title: &str,
    body: &str,
    _icon_uri: Option<&str>,
    on_activated: impl FnOnce() + Send + 'static,
) -> Result<(), String> {
    ensure_application_registered();
    let title = title.to_string();
    let body = body.to_string();
    std::thread::spawn(move || {
        let response = mac_notification_sys::send_notification(&title, None, &body, None);
        match response {
            Ok(mac_notification_sys::NotificationResponse::Click)
            | Ok(mac_notification_sys::NotificationResponse::ActionButton(_)) => on_activated(),
            _ => {}
        }
    });
    Ok(())
}
