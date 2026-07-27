# Architecture

A file-by-file map of the codebase: what each file does and why it exists. Read [`README.md`](./README.md) first for the project overview, tech stack, and security notes — this doc goes one level deeper, into the actual source layout.

## High-level shape

Silos is a [Tauri 2](https://tauri.app/) app: a Rust backend (`src-tauri/`) that owns every native OS window and webview, driven by a React/TypeScript frontend (`src/`) that's really **several different small UIs**, not one single-page app. Which UI renders is decided entirely by a URL query parameter the Rust side sets when it creates each window/webview — see `src/App.tsx`.

Concretely, one "app" the user creates (e.g. "My Google Apps") is:
- one native OS window, containing
- one embedded **sidebar** webview (the subspace list + rail buttons), plus
- one embedded webview **per subspace** (the actual website content), plus
- one embedded **toolbar** webview per subspace (tabs/address bar), created on demand

All of that is orchestrated from Rust; React only ever renders whichever single piece it was told to via its URL.

## `src-tauri/` — Rust backend

- **`main.rs`** — binary entry point, just calls `silos_lib::run()`.
- **`lib.rs`** — Tauri app bootstrap: registers every `#[tauri::command]` so the frontend can call it over IPC, wires up the single-instance plugin (so launching a second copy focuses the existing one or opens the requested app), and builds the dashboard window.
- **`commands.rs`** — the bulk of the app's logic, ~3000 lines. Every `#[tauri::command]` function the frontend invokes lives here: creating/deleting apps and subspaces, opening/closing/locking windows, PIN hashing and verification (Argon2id), icon fetching/cropping/rendering, tray icon management, session data clearing, drag-reorder persistence, Start Menu shortcut creation, and the new-tab link-interception script injected into every subspace webview.
- **`models.rs`** — the data shapes persisted to disk (`WebApp`, `Subspace`, `IconStyle`, `AppConfig`) and their serde defaults, plus `WebAppView` — the same `WebApp` shape sent to the frontend, with `pin_hash` stripped out and replaced by a plain `has_pin: bool`.
- **`layout.rs`** — window/webview label naming conventions (so e.g. `app-<id>`, `sidebar-<id>`, `tray-<id>` are generated consistently in one place) plus small `Mutex`-backed in-memory state: which subspace is active per app, which apps are backgrounded/locked, current sidebar width, open tabs per subspace.
- **`store.rs`** — the portable config store: resolves `data_root()` (a `data/` folder next to the executable, not an OS app-data directory — this is what makes the app portable), loads/saves `AppConfig` as JSON, and slugifies app names into filesystem-safe folder names.
- **`shortcuts.rs`** — OS-agnostic half of Start Menu / desktop shortcut creation: icon rendering pipeline (SVG rasterizing, rounding, backgrounds), filename sanitizing. Delegates the actual per-OS shortcut file format to `platform/`.
- **`platform/`** — per-OS code, feature-gated with `cfg(windows)` / `cfg(target_os = "macos")` / `cfg(target_os = "linux")`:
  - **`windows/`** — the only platform actually built, run, and tested. `shortcuts.rs` writes real `.lnk` files; `winid.rs` gives each app window its own Windows taskbar identity (AppUserModelID) so multiple webapps don't all group under one taskbar button; `webview_ext.rs` and `notifications.rs` handle WebView2-specific setup and toast notifications.
  - **`macos/`**, **`linux/`** — written by Claude in preparation for future support, **never compiled or tested** on those operating systems. See the README's platform-support section before trusting any of this.

## `src/` — React/TypeScript frontend

- **`App.tsx`** — the router-that-isn't-a-router: reads `window.location.search` once at module load and picks which top-level component to render based on which query param is present (`?appId=`, `?settingsForApp=`, `?addPopupFor=`, `?quitConfirmFor=`, etc.). Each Tauri window/webview is created with a different URL, so each one renders a completely different UI from this same bundle.
- **`api.ts`** — the entire IPC surface: one thin wrapper function per Rust `#[tauri::command]`, so the rest of the frontend never calls `invoke()` directly.
- **`types.ts`** — TypeScript mirrors of the Rust `models.rs` structs (kept in sync by hand — there's no shared schema generation between the two).
- **`colors.ts`** — the deterministic session-group color assignment used for the sidebar's session indicator (golden-angle hue stepping so colors stay visually distinct as new groups appear).
- **`main.tsx`** — standard React root mount, nothing app-specific.

### `src/components/`

- **`Dashboard.tsx`** — the main window: grid of app cards, create/delete/open, per-card settings shortcut.
- **`AppSidebar.tsx`** — the subspace rail inside an app window: drag-to-reorder (via [`@dnd-kit`](https://dndkit.com/) — see the README for why this replaced an earlier hand-rolled implementation), session-color indicators, and the bottom action buttons (add subspace, expand/collapse, dashboard, settings, quit).
- **`SiteSearch.tsx`** — the shared "type a name/domain → get a Name/URL/Icon card" flow, reused by both app creation and subspace creation.
- **`IconPicker.tsx`** — the four ways to source an icon (favicon fetch, local file, macOSicons.com search, direct image URL), shared across app creation, subspace creation, and both settings screens.
- **`IconCropModal.tsx`** — square crop/zoom editor for a picked icon, backed by `react-easy-crop`.
- **`IconSizePreview.tsx`** — renders the icon at several real target sizes (16px–256px) so the user can see how small it'll actually look before committing.
- **`AddSubspacePopup.tsx`** — the standalone window opened by the sidebar's "+" button.
- **`QuitConfirmPopup.tsx`** — the small standalone confirmation window for "close this app entirely, including from the tray."
- **`ConfirmTyped.tsx`** — reusable "type OK to confirm" control used by every destructive action (delete app, delete subspace, clear session data, reset sessions).
- **`AppSettingsView.tsx`** — per-app settings window (PIN, background/tray behavior, icon defaults).
- **`SettingsView.tsx`** — per-subspace settings window (name/start URL, session sharing, icon override, clear data / delete subspace).
- **`GlobalSettingsView.tsx`** — the one cross-app setting so far: the macOSicons.com API key.
- **`PinPrompt.tsx`** — the shared PIN entry UI, used both for unlocking an app and for the in-window re-lock overlay.
- **`UnlockAppScreen.tsx`** — wraps `PinPrompt` for the "open a PIN-protected app" flow specifically.
- **`Toolbar.tsx`** — per-subspace tab strip + address bar webview.
- **`icons.tsx`** — small inline SVG icon components (gear, home, lock, trash, power, etc.) — kept monochrome/line-style on purpose so nothing renders as a full-color emoji glyph regardless of OS/theme.

## Design system docs

Not code, but part of how this codebase was built: [`DESIGN.md`](./DESIGN.md) is a structured design-token reference (colors, type scale, spacing, component rules) that [`CLAUDE.md`](./CLAUDE.md) and Claude Code's `impeccable` skill read automatically before any UI work, so visual decisions stay consistent across sessions instead of drifting. [`PRODUCT.md`](./PRODUCT.md) covers positioning and target users. Both are referenced directly from `CLAUDE.md`.
