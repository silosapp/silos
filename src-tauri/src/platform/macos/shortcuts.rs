//! macOS-only half of shortcut creation: writing a minimal `.app` bundle
//! stub into `~/Applications` (Finder/Spotlight/Dock only recognize real
//! bundles, unlike Windows' flat `.lnk` or Linux's `.desktop` file) plus its
//! `.icns` icon. OS-agnostic parts (icon pixel pipeline, filename
//! sanitizing) live in the common `crate::shortcuts` facade, which this
//! module is called from.
//!
//! UNTESTED: written from Apple's Bundle Programming Guide / icns format
//! docs with no macOS machine available to build or launch against. Things
//! to verify on first real run: does LaunchServices pick up a bundle whose
//! `CFBundleExecutable` is a plain shell script (no compiled Mach-O) without
//! extra flags, does Gatekeeper/quarantine block the script from running
//! (bundles built by a *running, unsigned* app rather than downloaded
//! normally may dodge the quarantine xattr, but this needs confirming), and
//! whether Finder's icon cache goes stale on `icon.icns` overwrite the same
//! way Explorer's does on Windows (see `generated_icon_path`'s doc comment)
//! — no cache-busting is attempted here yet.

use std::io::Write as _;
use std::path::PathBuf;

fn applications_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join("Applications"))
}

/// Bundle path is keyed off `app_name` (like Windows' `.lnk`, unlike
/// Linux's `app_id`-keyed `.desktop`), so a rename has to remove the old
/// bundle and create a new one under the new name — which is exactly what
/// the common `rename_shortcut` facade already does uniformly.
fn bundle_path(app_name: &str) -> Option<PathBuf> {
    Some(applications_dir()?.join(format!("{}.app", crate::shortcuts::sanitize_filename(app_name))))
}

fn bundle_identifier(app_id: &str) -> String {
    let cleaned: String = app_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    format!("com.silos.webapp.{cleaned}")
}

/// XML-escapes a string for embedding in an Info.plist `<string>` value.
fn plist_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn write_info_plist(bundle: &std::path::Path, app_id: &str, app_name: &str) -> std::io::Result<()> {
    let plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key>
	<string>{name}</string>
	<key>CFBundleDisplayName</key>
	<string>{name}</string>
	<key>CFBundleIdentifier</key>
	<string>{ident}</string>
	<key>CFBundleVersion</key>
	<string>1.0</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleExecutable</key>
	<string>launcher</string>
	<key>CFBundleIconFile</key>
	<string>icon.icns</string>
	<key>LSMinimumSystemVersion</key>
	<string>11.0</string>
	<key>NSHighResolutionCapable</key>
	<true/>
</dict>
</plist>
"#,
        name = plist_escape(app_name),
        ident = plist_escape(&bundle_identifier(app_id)),
    );
    std::fs::write(bundle.join("Contents/Info.plist"), plist)
}

/// A `sh` launcher script, not a compiled Mach-O: this app has no per-webapp
/// binary to point `CFBundleExecutable` at, so the bundle re-execs the main
/// Silos binary with the same `--open-app <id>` argument the
/// Windows/Linux shortcuts use. Single-quoted with embedded `'` escaped
/// (`'\''`) rather than double-quoted, so `$`/backtick in the exe path
/// (unlikely, but matches the paranoia in the Linux `Exec=` quoting) can't
/// be shell-expanded.
fn write_launcher(bundle: &std::path::Path, exe: &std::path::Path, app_id: &str) -> std::io::Result<()> {
    let exe_str = exe.to_string_lossy().replace('\'', r"'\''");
    let script = format!("#!/bin/sh\nexec '{exe_str}' --open-app {app_id}\n");
    let path = bundle.join("Contents/MacOS/launcher");
    let mut file = std::fs::File::create(&path)?;
    file.write_all(script.as_bytes())?;
    drop(file);

    use std::os::unix::fs::PermissionsExt;
    let mut perms = std::fs::metadata(&path)?.permissions();
    perms.set_mode(0o755);
    std::fs::set_permissions(&path, perms)
}

/// Minimal single-size `.icns`: one `ic08` element (256×256, PNG-backed —
/// icns has stored raw PNG payloads for its larger sizes since Mac OS X
/// 10.7, so this reuses the same `image` PNG encoder the Linux writer uses
/// instead of needing a dedicated icns/PNG-to-native-bitmap conversion).
/// Finder synthesizes the smaller sizes (16/32/128px) by downscaling this
/// one, which will look softer than a hand-tuned multi-resolution icns —
/// acceptable for now, revisit by adding `ic07`(128)/`ic09`(512) elements
/// if that's ever visibly a problem.
fn write_icns(rgba: &image::RgbaImage, dest: &std::path::Path) -> Option<()> {
    let mut png_bytes = Vec::new();
    image::DynamicImage::ImageRgba8(rgba.clone())
        .write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .ok()?;

    let mut file = Vec::with_capacity(8 + 8 + png_bytes.len());
    file.extend_from_slice(b"icns");
    file.extend_from_slice(&[0u8; 4]); // total length, patched below
    file.extend_from_slice(b"ic08");
    let elem_len = (8 + png_bytes.len()) as u32;
    file.extend_from_slice(&elem_len.to_be_bytes());
    file.extend_from_slice(&png_bytes);
    let total_len = (file.len() as u32).to_be_bytes();
    file[4..8].copy_from_slice(&total_len);

    std::fs::write(dest, file).ok()
}

fn build_icon(bundle: &std::path::Path, source: &str, background: Option<&str>, padding_percent: u8, rounded: bool) -> Option<()> {
    let rgba = crate::shortcuts::render_icon(source, background, padding_percent, rounded)?;
    let dest = bundle.join("Contents/Resources/icon.icns");
    // Overwrite by removing first (not just truncate-in-place via
    // fs::write) in case that helps Finder notice the change — see the
    // module-level TODO about unverified icon-cache staleness.
    let _ = std::fs::remove_file(&dest);
    write_icns(&rgba, &dest)
}

pub fn create_shortcut(
    app_id: &str,
    _data_slug: &str,
    app_name: &str,
    icon_source: Option<&str>,
    icon_background: Option<&str>,
    icon_padding_percent: u8,
    icon_rounded: bool,
) {
    let Some(bundle) = bundle_path(app_name) else { return };
    let Ok(exe) = std::env::current_exe() else { return };

    if std::fs::create_dir_all(bundle.join("Contents/MacOS")).is_err() {
        return;
    }
    if std::fs::create_dir_all(bundle.join("Contents/Resources")).is_err() {
        return;
    }
    if write_info_plist(&bundle, app_id, app_name).is_err() {
        return;
    }
    if write_launcher(&bundle, &exe, app_id).is_err() {
        return;
    }
    if let Some(src) = icon_source {
        build_icon(&bundle, src, icon_background, icon_padding_percent, icon_rounded);
    }
}

pub fn remove_shortcut(_app_id: &str, app_name: &str) {
    if let Some(bundle) = bundle_path(app_name) {
        if bundle.exists() {
            let _ = std::fs::remove_dir_all(bundle);
        }
    }
}
