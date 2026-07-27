use crate::models::AppConfig;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::AppHandle;

/// Pure path-logic half of macOS's data root resolution, split out so it's
/// unit-testable without a real `.app` bundle on disk (see `mod tests`
/// below). On macOS the exe lives at `<Name>.app/Contents/MacOS/<bin>`, and
/// bundle contents are generally treated as read-only/immutable (Gatekeeper
/// re-signing, `.app` replace-on-update, etc) — so unlike Windows/Linux,
/// "next to the exe" would put `data/` inside the bundle. This instead finds
/// the nearest ancestor directory ending in `.app` and returns *its*
/// parent, so `data/` lands next to the bundle itself. Falls back to the
/// exe's own parent dir if no `.app` ancestor exists at all (e.g. running
/// the raw binary outside a bundle, such as `cargo run`/`tauri dev`).
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn macos_bundle_data_root(exe: &Path) -> PathBuf {
    let bundle_root = exe.ancestors().find(|p| {
        p.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("app"))
            .unwrap_or(false)
    });
    match bundle_root {
        Some(app_dir) => app_dir.parent().unwrap_or(app_dir).to_path_buf(),
        None => exe.parent().unwrap_or(exe).to_path_buf(),
    }
}

/// Portable data root: a "data" folder next to the exe (Windows/Linux) or
/// next to the `.app` bundle (macOS — see `macos_bundle_data_root`), instead
/// of Roaming/Local/ProgramData/XDG dirs, so the whole install can be
/// moved/copied freely.
pub fn data_root() -> PathBuf {
    let exe = std::env::current_exe().expect("failed to resolve exe path");
    #[cfg(target_os = "macos")]
    let base = macos_bundle_data_root(&exe);
    #[cfg(not(target_os = "macos"))]
    let base = exe.parent().expect("exe has no parent dir").to_path_buf();
    base.join("data")
}

#[cfg(test)]
mod tests {
    use super::macos_bundle_data_root;
    use std::path::Path;

    #[test]
    fn finds_app_bundle_root_two_levels_up() {
        let exe = Path::new("/Applications/Silos.app/Contents/MacOS/silos");
        assert_eq!(macos_bundle_data_root(exe), Path::new("/Applications"));
    }

    #[test]
    fn matches_app_extension_case_insensitively() {
        let exe = Path::new("/Users/x/Applications/Foo.App/Contents/MacOS/foo");
        assert_eq!(macos_bundle_data_root(exe), Path::new("/Users/x/Applications"));
    }

    #[test]
    fn falls_back_to_exe_parent_outside_any_bundle() {
        let exe = Path::new("/opt/silos/silos");
        assert_eq!(macos_bundle_data_root(exe), Path::new("/opt/silos"));
    }

    #[test]
    fn uses_nearest_app_ancestor_when_nested() {
        // Pathological (a bundle inside a bundle isn't a real scenario) but
        // pins the "nearest ancestor wins" behavior rather than the
        // outermost one.
        let exe = Path::new("/A.app/Nested/B.app/Contents/MacOS/bin");
        assert_eq!(macos_bundle_data_root(exe), Path::new("/A.app/Nested"));
    }
}

pub fn webapps_dir() -> PathBuf {
    data_root().join("webapps")
}

/// Turns an app name into a filesystem-safe folder name (lowercase,
/// non-alphanumeric runs collapsed to '-'), deduplicated against `taken`.
pub fn slugify(name: &str, taken: &HashSet<String>) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            slug.push(c);
            last_dash = false;
        } else if !last_dash && !slug.is_empty() {
            slug.push('-');
            last_dash = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        slug = "app".to_string();
    }

    if !taken.contains(&slug) {
        return slug;
    }
    let mut n = 2;
    loop {
        let candidate = format!("{slug}-{n}");
        if !taken.contains(&candidate) {
            return candidate;
        }
        n += 1;
    }
}

pub struct Store {
    pub config: Mutex<AppConfig>,
    pub config_path: PathBuf,
}

impl Store {
    pub fn load(_app: &AppHandle) -> Self {
        let data_dir = data_root();
        fs::create_dir_all(&data_dir).expect("failed to create app data dir");
        let config_path = data_dir.join("config.json");

        let mut config: AppConfig = if config_path.exists() {
            let raw = fs::read_to_string(&config_path).unwrap_or_default();
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        let migrated = Self::assign_missing_slugs(&mut config);

        let store = Store {
            config: Mutex::new(config),
            config_path,
        };
        if migrated {
            store.save();
        }
        store
    }

    /// Backfills `data_slug` for apps loaded from an older config (or freshly
    /// created ones missing it), and migrates any session folders still
    /// sitting under the old flat data/sessions/<group> layout into
    /// data/webapps/<slug>/<group>. Returns true if the config changed.
    fn assign_missing_slugs(config: &mut AppConfig) -> bool {
        let mut changed = false;
        let mut taken: HashSet<String> = config
            .apps
            .iter()
            .map(|a| a.data_slug.clone())
            .filter(|s| !s.is_empty())
            .collect();

        let old_sessions_dir = data_root().join("sessions");

        for app in config.apps.iter_mut() {
            if app.data_slug.is_empty() {
                let slug = slugify(&app.name, &taken);
                taken.insert(slug.clone());
                app.data_slug = slug;
                changed = true;
            }

            if app.created_at == 0 {
                app.created_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                changed = true;
            }

            if old_sessions_dir.exists() {
                let new_app_dir = webapps_dir().join(&app.data_slug);
                for subspace in &app.subspaces {
                    let old_dir = old_sessions_dir.join(&subspace.session_group);
                    let new_dir = new_app_dir.join(&subspace.session_group);
                    if old_dir.exists() && !new_dir.exists() {
                        if let Some(parent) = new_dir.parent() {
                            let _ = fs::create_dir_all(parent);
                        }
                        let _ = fs::rename(&old_dir, &new_dir);
                    }
                }
            }
        }

        changed
    }

    pub fn save(&self) {
        let config = self.config.lock().unwrap();
        let raw = serde_json::to_string_pretty(&*config).expect("failed to serialize config");
        fs::write(&self.config_path, raw).expect("failed to write config");
    }
}
