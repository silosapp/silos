// TODO(linux): `platform::linux::notifications::show_toast` already renders
// a real native notification (via D-Bus) and reports clicks back — what's
// still missing here is the *interception* half Windows has: taking over
// display of a page's `Notification` API call in the first place.
// WebKitGTK's `WebKitWebView` "permission-request" and "show-notification"
// signals are the rough equivalents of WebView2's
// `PermissionRequested`/`NotificationReceived`, but reaching them means
// calling into `webkit2gtk`/`javascriptcore-rs` directly (as `with_webview`
// exposes on this platform — see the doc example in tauri's `webview/mod.rs`
// — but this app doesn't otherwise depend on those crates yet).
//
// Session isolation is NOT a gap here, unlike the note this comment used to
// carry: tauri-runtime-wry keys a `WebContext` off the exact `data_directory`
// path passed to `WebviewBuilder::data_directory()` (see its `lib.rs`,
// `web_context_key = webview_attributes.data_directory`), and wry's
// WebKitGTK backend feeds that path into
// `WebContext::builder().base_data_directory(...)` +
// `website_data_manager(...)`. So the same `.data_directory(data_dir)` call
// already used in `commands::open_tab_internal` gives each subspace its own
// WebKitGTK profile on Linux, same as it does on Windows — no extra code
// needed here for that part.
pub fn setup_web_notifications(_app_handle: &tauri::AppHandle, _data_slug: &str, _app_id: &str, _webview: &tauri::webview::Webview) {}

pub fn setup_password_autosave(_webview: &tauri::webview::Webview) {}

// TODO(linux): WebKitGTK's equivalent is the `WebKitWebView`
// "load-failed-with-tls-errors" signal (or pre-allowing via
// `webkit_web_context_allow_tls_certificate_for_host`) — reachable through
// `with_webview`'s raw `webkit2gtk` handle, not wired up yet.
pub fn allow_self_signed_certificates(_webview: &tauri::webview::Webview) {}
