//! Gives each webapp window its own Windows taskbar identity (separate
//! grouping/pin/jump-list from the dashboard and from other webapps) even
//! though they all run in the same Silos process. Without this, Windows
//! groups every top-level window of a process under one taskbar button by
//! default, since they all inherit the process's implicit AppUserModelID.
//!
//! Takes the window's `hwnd()` result and `run_on_main_thread` as plain
//! values/closures instead of the `Window`/`WebviewWindow` type directly,
//! since those are two distinct, non-unified types in Tauri and this needs
//! to work for both (the dashboard is a WebviewWindow, per-app windows are
//! bare Windows).

pub fn set_window_app_id(
    hwnd: tauri::Result<windows::Win32::Foundation::HWND>,
    run_on_main_thread: impl FnOnce(Box<dyn FnOnce() + Send>) -> tauri::Result<()>,
    app_user_model_id: &str,
) {
    let Ok(hwnd) = hwnd else { return };
    // HWND wraps a raw pointer, which isn't Send; ferry it across the
    // run_on_main_thread closure boundary as a plain integer instead.
    let hwnd_addr = hwnd.0 as isize;
    let aumid = app_user_model_id.to_string();
    let _ = run_on_main_thread(Box::new(move || unsafe {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Storage::EnhancedStorage::PKEY_AppUserModel_ID;
        use windows::Win32::System::Com::StructuredStorage::PROPVARIANT;
        use windows::Win32::UI::Shell::PropertiesSystem::{IPropertyStore, SHGetPropertyStoreForWindow};

        let hwnd = HWND(hwnd_addr as *mut core::ffi::c_void);
        let Ok(store): windows::core::Result<IPropertyStore> = SHGetPropertyStoreForWindow(hwnd) else {
            return;
        };
        let value = PROPVARIANT::from(aumid.as_str());
        if store.SetValue(&PKEY_AppUserModel_ID, &value).is_ok() {
            let _ = store.Commit();
        }
    }));
}

/// Stamps a Start Menu shortcut (.lnk) with the same AppUserModelID given to
/// its webapp's window, so Windows recognizes that ID as belonging to a real,
/// named/iconed app. Without this, `ToastNotificationManager::
/// CreateToastNotifierWithId` for that AUMID is rejected — an unregistered
/// AUMID can't be used to show a toast notification.
pub fn set_shortcut_app_id(shortcut_path: &std::path::Path, app_user_model_id: &str) {
    use windows::core::HSTRING;
    use windows::Win32::Storage::EnhancedStorage::PKEY_AppUserModel_ID;
    use windows::Win32::System::Com::StructuredStorage::PROPVARIANT;
    use windows::Win32::UI::Shell::PropertiesSystem::{
        IPropertyStore, SHGetPropertyStoreFromParsingName, GPS_READWRITE,
    };

    let Some(path_str) = shortcut_path.to_str() else { return };
    unsafe {
        let path = HSTRING::from(path_str);
        let Ok(store): windows::core::Result<IPropertyStore> = SHGetPropertyStoreFromParsingName(
            &path,
            None::<&windows::Win32::System::Com::IBindCtx>,
            GPS_READWRITE,
        ) else {
            return;
        };
        let value = PROPVARIANT::from(app_user_model_id);
        if store.SetValue(&PKEY_AppUserModel_ID, &value).is_ok() {
            let _ = store.Commit();
        }
    }
}

/// Turns a data_slug (already filesystem-safe: lowercase alnum + dashes)
/// into a valid AppUserModelID component (letters/digits/periods/underscores
/// only, per the AUMID spec).
pub fn aumid_for_slug(prefix: &str, slug: &str) -> String {
    let cleaned: String = slug
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();
    format!("{prefix}.{cleaned}")
}
