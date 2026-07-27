# Changelog

## [Unreleased]

## [0.1.1] - 2026-07-27

### Added
- Footer at the bottom of the dashboard showing app version, build date, and commit hash.
- Per-app option (Security tab) to silently accept self-signed/invalid TLS certificate errors, for apps pointed at a known local/dev server. Off by default; Windows only for now.
- Multi-language UI (Italian/English) via react-i18next, with a language switcher in Global Settings. Defaults to the system language when supported, otherwise English.
- Global Settings reorganized into sections (Language, Extensions) for room to grow.

### Changed
- Global Settings navigation restructured into a sectioned sidebar, matching the per-app settings layout.
- App settings (all tabs) and Global Settings no longer autosave on blur/change: each section now has explicit Save/Cancel buttons that appear only when something changed, plus a success/error toast on save.

### Fixed
- Switching language now updates every open window (dashboard, app settings, etc.) immediately instead of only the window it was changed in.

## [0.1.0] - 2026-07-27

### Added
- First public release.
