//! Native Linux desktop notifications via the freedesktop.org
//! `org.freedesktop.Notifications` D-Bus interface, through the
//! `notify-rust` crate (its Unix/D-Bus backend — the crate also builds for
//! Windows/macOS but this module only pulls in the Linux path).
//!
//! UNTESTED: no Linux machine available to verify against a real
//! notification daemon (GNOME Shell / dunst / mako / etc — behavior for
//! actions and icon paths is known to vary between them). Re-check on first
//! real Linux run: does the "default" action actually fire on a plain
//! click in the daemon actually running (some daemons render actions as
//! separate buttons only, no click-to-activate-default), and does
//! `icon_uri` (which may be an arbitrary http(s)/data: URL from the page's
//! `Notification` API, not a local path or icon-theme name) get silently
//! dropped rather than shown — no fetch-and-cache-to-tempfile step exists
//! here yet, unlike the Windows toast XML which can reference a remote URL
//! directly.

use notify_rust::{Hint, Notification};

/// Shows a notification, calling `on_activated` once if/when the user
/// clicks it (the "default" action — the one a plain click on the
/// notification body invokes, per the freedesktop spec). Blocks on the
/// D-Bus `ActionInvoked`/`NotificationClosed` signal on a background
/// thread, mirroring the Windows `Activated` event's async-callback shape
/// even though the underlying wait here is synchronous.
pub fn show_toast(
    _aumid: &str,
    title: &str,
    body: &str,
    icon_uri: Option<&str>,
    on_activated: impl FnOnce() + Send + 'static,
) -> Result<(), String> {
    let mut notification = Notification::new();
    notification
        .summary(title)
        .body(body)
        .action("default", "default")
        // Keeps the notification on-screen until explicitly closed/acted on
        // instead of auto-expiring before `wait_for_action` gets a signal.
        .hint(Hint::Resident(true));
    if let Some(icon) = icon_uri.filter(|s| !s.is_empty()) {
        notification.icon(icon);
    }

    let handle = notification.show().map_err(|e| e.to_string())?;

    let mut on_activated = Some(on_activated);
    std::thread::spawn(move || {
        handle.wait_for_action(move |action| {
            if action == "default" {
                if let Some(cb) = on_activated.take() {
                    cb();
                }
            }
        });
    });

    Ok(())
}
