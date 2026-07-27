# Changelog

## [Unreleased]

### Added
- Footer at the bottom of the dashboard showing app version, build date, and commit hash.
- Per-app option (Security tab) to silently accept self-signed/invalid TLS certificate errors, for apps pointed at a known local/dev server. Off by default; Windows only for now.
- Multi-language UI (Italian/English) via react-i18next, with a language switcher in Global Settings. Defaults to the system language when supported, otherwise English.
- Global Settings reorganized into sections (Language, Extensions) for room to grow.

### Changed
- Global Settings navigation restructured into a sectioned sidebar, matching the per-app settings layout.

## [0.1.0] - 2026-07-27

### Added
- First public release.
