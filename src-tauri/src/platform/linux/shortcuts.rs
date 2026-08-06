//! Linux-only half of shortcut creation: rendering the `.png` icon and
//! writing a freedesktop.org `.desktop` launcher into the user's
//! `applications` dir so it shows up in the app menu / can be pinned to a
//! dock/taskbar. OS-agnostic parts (icon pixel pipeline, filename
//! sanitizing, cache-busting path) live in the common `crate::shortcuts`
//! facade, which this module is called from.
//!
//! UNTESTED: written from the freedesktop Desktop Entry Specification
//! (https://specifications.freedesktop.org/desktop-entry-spec/latest/) with
//! no Linux machine available to verify against a real DE (GNOME/KDE/etc).
//! Re-check on first real Linux run: does the app-menu icon show up without
//! a manual `update-desktop-database`/re-login, does escaping below survive
//! app names with quotes/`$`/backticks, does XDG_DATA_HOME actually get
//! picked up on distros that set it non-default.

use std::path::PathBuf;

/// XDG "applications" dir shortcuts must land in to show up in the app
/// menu, honoring `XDG_DATA_HOME` when set (falls back to the spec's
/// default of `~/.local/share`).
fn applications_dir() -> Option<PathBuf> {
    if let Ok(data_home) = std::env::var("XDG_DATA_HOME") {
        if !data_home.is_empty() {
            return Some(PathBuf::from(data_home).join("applications"));
        }
    }
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".local/share/applications"))
}

/// Desktop-entry filenames double as the app's stable ID in most DEs (used
/// for taskbar grouping / pinning), so this is keyed off `app_id` — not
/// `app_name` like Windows' `.lnk` — meaning a rename doesn't need to
/// delete+recreate under a new filename. `rename_shortcut` in the common
/// facade still does remove+recreate uniformly across platforms for
/// simplicity; harmless here since the filename doesn't change anyway.
fn desktop_path(app_id: &str) -> Option<PathBuf> {
    Some(applications_dir()?.join(format!("silos-{}.desktop", crate::shortcuts::sanitize_filename(app_id))))
}

/// Renders and PNG-encodes the icon (Desktop Entry `Icon=` accepts either an
/// icon-theme name or an absolute path to PNG/SVG/XPM — an absolute path is
/// used here, same approach as the `.ico`/`.icns` writers).
fn build_icon(source: &str, app_id: &str, background: Option<&str>, padding_percent: u8, rounded: bool) -> Option<PathBuf> {
    let source_bytes = std::fs::read(source).ok()?;
    let hash = crate::shortcuts::content_hash(&[
        &source_bytes,
        background.unwrap_or("").as_bytes(),
        &[padding_percent, rounded as u8],
    ]);
    let dest = crate::shortcuts::generated_icon_path(app_id, "png", &hash);
    std::fs::create_dir_all(dest.parent()?).ok()?;
    crate::shortcuts::remove_old_shortcut_icons(app_id, &dest);

    let resized = crate::shortcuts::render_icon(source, background, padding_percent, rounded)?;
    image::DynamicImage::ImageRgba8(resized).save(&dest).ok()?;
    Some(dest)
}

/// Escapes a value for use inside a Desktop Entry `Exec=` argument list per
/// the spec's quoting rules, then wraps it in double quotes: reserved
/// characters (space, `"`, `` ` ``, `$`, `\`) only need escaping inside a
/// quoted argument, and everything here is quoted unconditionally so a
/// name/path containing spaces doesn't get split into multiple argv
/// entries.
fn quote_exec_arg(s: &str) -> String {
    let escaped = s
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('`', "\\`")
        .replace('$', "\\$");
    format!("\"{escaped}\"")
}

/// Desktop Entry `Name=` value: spec forbids raw newlines and treats `\`
/// as the start of an escape sequence, so both are stripped/neutralized
/// rather than reproduced literally.
fn escape_name(s: &str) -> String {
    s.replace('\\', "/").replace(['\n', '\r'], " ")
}

/// Creates (or overwrites) a `.desktop` launcher that opens this webapp
/// directly, bypassing the dashboard: `silos --open-app <id>`
/// (mirrors the `--open-app` Start Menu shortcut arguments on Windows).
pub fn create_shortcut(
    app_id: &str,
    _data_slug: &str,
    app_name: &str,
    icon_source: Option<&str>,
    icon_background: Option<&str>,
    icon_padding_percent: u8,
    icon_rounded: bool,
) {
    let Some(dir) = applications_dir() else { return };
    let Some(path) = desktop_path(app_id) else { return };
    let Ok(exe) = std::env::current_exe() else { return };
    let Some(exe_str) = exe.to_str() else { return };

    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }

    let icon_path = icon_source.and_then(|src| build_icon(src, app_id, icon_background, icon_padding_percent, icon_rounded));
    let icon_line = icon_path
        .as_deref()
        .and_then(|p| p.to_str())
        .map(|s| format!("Icon={s}\n"))
        .unwrap_or_default();

    let contents = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Version=1.0\n\
         Name={name}\n\
         Exec={exe} --open-app {app_id}\n\
         {icon_line}\
         Terminal=false\n\
         NoDisplay=false\n\
         Categories=Network;\n",
        name = escape_name(app_name),
        exe = quote_exec_arg(exe_str),
        app_id = app_id,
        icon_line = icon_line,
    );

    let _ = std::fs::write(&path, contents);
}

pub fn remove_shortcut(app_id: &str, _app_name: &str) {
    if let Some(path) = desktop_path(app_id) {
        if path.exists() {
            let _ = std::fs::remove_file(path);
        }
    }
}
