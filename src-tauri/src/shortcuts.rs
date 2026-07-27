//! OS-agnostic half of shortcut creation: sanitizing names, the shared
//! icon-render pipeline (pad/composite/round), and the "regenerate icon path
//! so shell icon caches don't go stale" bookkeeping. The actual platform
//! write (Start Menu `.lnk` + `.ico` on Windows, `.app` bundle stub + `.icns`
//! on macOS, `.desktop` file + `.png` on Linux) lives in
//! `crate::platform::shortcuts`, which this module delegates to.

use std::path::{Path, PathBuf};

pub(crate) fn sanitize_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if r#"\/:*?"<>|"#.contains(c) { '_' } else { c })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "app".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Where a freshly-generated shortcut icon is written (next to the other
/// per-webapp icon files under `data/icons/`), in whatever extension the
/// calling platform module encodes to (`ico`/`icns`/`png`).
///
/// A fresh, uniquely-named path per call, not a stable per-app one: every
/// desktop shell we target (Windows Explorer's icon cache is the confirmed
/// case; icon caches on other shells behave similarly) keys off file path
/// and silently keeps showing a stale bitmap for a path it's already seen
/// even after that file's bytes change on disk. A new path each time forces
/// a re-read instead of serving a cached one.
pub(crate) fn generated_icon_path(app_id: &str, extension: &str) -> PathBuf {
    crate::store::data_root()
        .join("icons")
        .join(format!("shortcut-{app_id}-{}.{extension}", uuid::Uuid::new_v4()))
}

/// Deletes every previously-generated shortcut icon for this app (all
/// `shortcut-{app_id}-*` files, any extension) before a fresh one is
/// written, so the cache-busting rename in `generated_icon_path` doesn't
/// leave orphaned files behind on every icon change.
pub fn remove_old_shortcut_icons(app_id: &str) {
    let dir = crate::store::data_root().join("icons");
    let Ok(entries) = std::fs::read_dir(&dir) else { return };
    let prefix = format!("shortcut-{app_id}-");
    for entry in entries.flatten() {
        if entry.file_name().to_string_lossy().starts_with(&prefix) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}

/// Shared render step (pad to a square, optionally composite on a background
/// color, optionally apply a rounded mask) all three platforms' shortcut
/// icon encoders start from. Encoding to the OS-appropriate container
/// (`.ico`/`.icns`/`.png`) happens in each `platform::<os>::shortcuts`
/// module — this only produces the raw pixels.
pub(crate) fn render_icon(source: &str, background: Option<&str>, padding_percent: u8, rounded: bool) -> Option<image::RgbaImage> {
    let img = image::open(Path::new(source)).ok()?;
    let mut resized = crate::commands::pad_and_resize(&img, 256, padding_percent);
    if let Some(hex) = background {
        resized = crate::commands::composite_on_background(resized, hex);
    }
    if rounded {
        resized = crate::commands::apply_rounded_mask(resized);
    }
    Some(resized)
}

/// Creates (or overwrites) this webapp's OS launcher shortcut (Start Menu
/// `.lnk` on Windows, `.app` bundle stub on macOS, `.desktop` file on
/// Linux). `icon_source` is the webapp's chosen icon file (favicon/user-
/// picked), if any; each platform falls back to its own default (the exe's
/// icon on Windows) otherwise. `data_slug` must match the one used for the
/// webapp window's own platform identity (AUMID on Windows).
pub fn create_shortcut(
    app_id: &str,
    data_slug: &str,
    app_name: &str,
    icon_source: Option<&str>,
    icon_background: Option<&str>,
    icon_padding_percent: u8,
    icon_rounded: bool,
) {
    crate::platform::shortcuts::create_shortcut(
        app_id,
        data_slug,
        app_name,
        icon_source,
        icon_background,
        icon_padding_percent,
        icon_rounded,
    );
}

pub fn remove_shortcut(app_id: &str, app_name: &str) {
    crate::platform::shortcuts::remove_shortcut(app_id, app_name);
}

/// Renames a shortcut when the app's display name changes. Windows/Linux key
/// their shortcut file off the *name* (Start Menu `.lnk` / legacy
/// `.desktop` naming), so the old file has to go and a new one take its
/// place; macOS's bundle is keyed off `app_id` internally but still needs
/// its visible name/menu title refreshed, so it goes through the same
/// remove+recreate path for simplicity.
pub fn rename_shortcut(
    app_id: &str,
    data_slug: &str,
    old_name: &str,
    new_name: &str,
    icon_source: Option<&str>,
    icon_background: Option<&str>,
    icon_padding_percent: u8,
    icon_rounded: bool,
) {
    if old_name == new_name {
        create_shortcut(app_id, data_slug, new_name, icon_source, icon_background, icon_padding_percent, icon_rounded);
        return;
    }
    remove_shortcut(app_id, old_name);
    create_shortcut(app_id, data_slug, new_name, icon_source, icon_background, icon_padding_percent, icon_rounded);
}
