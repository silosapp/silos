// TODO(macos): `platform::macos::notifications::show_toast` already renders
// a real native notification and reports clicks back — what's still missing
// here is the *interception* half Windows has: taking over display of a
// page's `Notification` API call in the first place (WebView2 exposes
// `NotificationReceived`/`PermissionRequested` events for this; WKWebView
// has no equivalent event, so it likely means implementing `WKUIDelegate`
// notification-related methods directly via `objc2`/`objc2-web-kit`, which
// this app doesn't otherwise depend on yet). Without this wiring, WKWebView
// falls back to its own default in-page notification permission UI/handling
// (untested whether that even prompts eagerly the same way Windows'
// pages-that-never-see-a-user-gesture case does) and `show_toast` is never
// called at all.
pub fn setup_web_notifications(_app_handle: &tauri::AppHandle, _data_slug: &str, _app_id: &str, _webview: &tauri::webview::Webview) {}

pub fn setup_password_autosave(_webview: &tauri::webview::Webview) {}

/// Deterministic per-subspace `WKWebsiteDataStore` identifier, passed to
/// `WebviewBuilder::data_store_identifier()` — the only session-isolation
/// mechanism WKWebView exposes. `.data_directory(path)` (what Windows and
/// Linux use, see `commands::open_tab_internal`) is a silent no-op under
/// WKWebView: there's no arbitrary-path data directory API, only a UUID
/// naming a system-managed store. Hashing the same `(data_slug,
/// session_group)` pair always yields the same UUID, so a subspace's
/// cookies/storage keep landing in the same store across app restarts.
///
/// Caveat: per Tauri's `data_store_identifier` docs, this only takes effect
/// on macOS 14+ / iOS 17+ — older macOS silently ignores it and every
/// subspace falls back to the single shared default `WKWebsiteDataStore`,
/// i.e. NOT isolated. No workaround exists at the wry/WKWebView level; a
/// real macOS build needs a minimum-OS-version check and an in-app warning
/// (or a "sessions aren't isolated on this macOS version" notice) once this
/// is exercised for real.
pub fn mac_data_store_id(data_slug: &str, session_group: &str) -> [u8; 16] {
    // Fixed, arbitrary namespace UUID — only needs to be stable across runs,
    // not meaningful on its own (same role as DNS/URL namespaces in RFC 4122).
    const NAMESPACE: uuid::Uuid = uuid::Uuid::from_bytes([
        0x9b, 0x1f, 0x5c, 0x9a, 0x9c, 0x0e, 0x4b, 0x4e, 0xa1, 0x0d, 0x9b, 0x5b, 0x86, 0x0e, 0x9a, 0x0a,
    ]);
    let name = format!("{data_slug}/{session_group}");
    *uuid::Uuid::new_v5(&NAMESPACE, name.as_bytes()).as_bytes()
}
