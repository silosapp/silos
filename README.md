# Silos

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

A portable Windows desktop app that turns any website into a standalone app window — with per-app **subspaces** that can either share a session (same login across Gmail/Calendar/Photos) or stay fully isolated (multiple WhatsApp/Gmail accounts side by side). Inspired by tools like WebCatalog, built for personal use.

No installer, no background service beyond the app itself: unzip, run, and the whole thing — binary and data — lives in one portable folder you can move or delete freely.

---

## ⚠️ Built entirely with Claude Code — read this first

I am **not an experienced programmer**. Every line of this codebase — Rust backend, React/TypeScript frontend, the whole architecture — was written through conversational prompting with [Claude Code](https://claude.com/claude-code) (Anthropic's coding agent). I tested behavior as a user and iterated on bugs I could observe, but I have not personally reviewed most of the Rust/TypeScript in depth the way an experienced engineer would.

I'm making this repo public for a few reasons:

- It's a personal project, but it might genuinely be useful to someone else.
- [`CLAUDE.md`](./CLAUDE.md) and [`DESIGN.md`](./DESIGN.md) are also public — if you work with Claude Code or AI-assisted development, I'd love feedback or criticism on **how** I used it: bad prompting habits, architecture decisions Claude made that you'd flag, places where "it works" isn't the same as "it's right."
- Even though there's no shortage of apps doing roughly this, someone might find it interesting enough to fork and take further.
- I want to be transparent about the tools and reasoning behind this, not present it as more polished/expert than it is.

If you spot something wrong, unsafe, or just naively done — please open an issue. That kind of feedback is exactly what I'm hoping for, not something to avoid.

---

## Features

- **Turn any site into a desktop app**, with an icon auto-fetched from the site (or your own PNG).
- **Subspaces sidebar** per app: create multiple "tabs" that either
  - share cookies/session (one Google identity across Gmail, Calendar, Photos), or
  - stay isolated (separate WhatsApp/Gmail accounts, each with its own session).
- Drag-and-drop subspace reordering.
- **PIN lock** per app, with optional auto-lock when the app is backgrounded.
- **Run in the system tray** instead of closing.
- **Per-subspace cache/cookie clearing**, individually or in bulk — same idea as clearing a browser profile.
- Fully portable: everything lives in a `data/` folder next to the executable.

## Platform support

**Windows only, for now.** That's the only platform this has actually been built, run, and tested on.

The `src-tauri/src/platform/macos` and `src-tauri/src/platform/linux` modules exist in the codebase — I asked Claude to prepare them ahead of time — but they have **never been compiled or tested** on those operating systems. Treat that code as an untested draft, not a working feature. macOS/Linux support may get finished properly at some point; it isn't right now.

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| App shell | [Tauri 2](https://tauri.app/) | Native window + Rust backend around the OS's own webview (WebView2 on Windows) instead of bundling Chromium like Electron — much smaller binaries, fits the "portable, single-folder" goal. |
| Frontend | React 19 + TypeScript | Standard, well-documented, plenty of AI-assisted-coding precedent to draw on. |
| Backend | Rust (`src-tauri/`) | Required by Tauri; handles window/webview orchestration, shortcuts, icon processing, PIN hashing (Argon2id), filesystem. |

## How it works

- **Portable data model**: `data_root()` resolves to a `data/` folder sitting next to the executable — not `%APPDATA%` or any OS-specific location. Move the whole install anywhere and it keeps working.
- **One window per app, one webview per subspace**: each "app" is a native OS window containing an embedded sidebar webview plus one embedded webview per subspace (Gmail, Calendar, a second WhatsApp account, etc.).
- **Session sharing/isolation is just directory sharing**: every subspace has a `session_group`. Subspaces with the same group point at the *same* on-disk WebView2 profile directory (`data/webapps/<app>/<session_group>/`); different groups get separate directories. "Shared session" and "isolated session" are literally the same mechanism — sharing or not sharing a folder — nothing more exotic than that.
- Everything the UI does (opening apps, managing subspaces, fetching icons, PIN checks, tray/shortcut management) goes through Tauri commands — Rust functions invoked from React via IPC.

## Security notes — what this app does and doesn't protect against

I want to be upfront about this rather than let the PIN feature imply more than it delivers.

- **PINs are hashed properly.** `pin_hash` is an Argon2id hash (via the `argon2` crate), never stored in plaintext.
- **The PIN is a UI gate, not encryption.** It locks the *app window* behind a prompt. It does **not** encrypt the session data sitting on disk in `data/webapps/...`. Anyone with filesystem access to that folder can read cookies/local storage directly — PIN or no PIN. This is a portable app, not a password vault, and that trade-off is deliberate: don't rely on the PIN to protect data from someone who already has access to your machine/files.
- **Session isolation is directory isolation**, not a sandbox. Two subspaces not sharing a `session_group` simply write to different folders — same trust model as separate browser profiles, not a hardened security boundary.
- **The app's own UI has a locked-down CSP** (`script-src 'self'`, etc., in `tauri.conf.json`) — but that only protects Silos's own dashboard/settings screens. It does **not** apply to whatever third-party website you load inside a subspace webview. Loading a site in Silos carries exactly the same trust assumptions as opening it in a normal browser tab.
- **No auto-update, no code signing (yet).** This is a portable exe you build or download as-is. If you don't trust a prebuilt binary, build it from source yourself.
- **Not security-audited.** This is a single-person, AI-assisted hobby project. It hasn't had a professional security review. I wouldn't point it at anything you'd consider highly sensitive (banking, etc.) without doing your own review first.

If you know this space better than I do and see a real problem here (not just a style nit), please open an issue — that's genuinely one of the reasons this repo is public.

## Getting started

Prerequisites: [Node.js](https://nodejs.org/), the [Rust toolchain](https://rustup.rs/), and the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/) (WebView2 already ships with Windows 10/11).

```bash
npm install

# dev mode (separate identifier from a built exe, so both can run side by side)
npm run tauri:dev

# production build
npm run build
npm run tauri build
```

## Project docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — file-by-file map of the codebase: what each file does and why.
- [`CLAUDE.md`](./CLAUDE.md) — the functional spec/instructions I gave Claude Code to build this.
- [`DESIGN.md`](./DESIGN.md) — the design system reference (colors, typography, spacing, component rules), kept in sync via Claude Code's `impeccable` skill.
- [`PRODUCT.md`](./PRODUCT.md) — positioning, target users, and design personality notes.

## Contributing / feedback

This is a personal project, built around my own needs for the apps I use day to day — not something designed to serve everyone's use case. Feedback is very welcome, especially on:

- Rust/TypeScript patterns that are wrong, unsafe, or just clumsy.
- Architecture decisions that don't hold up.
- How I directed Claude Code (via `CLAUDE.md` and this conversation history) — good or bad habits worth calling out.

Feel free to fork it and adapt it to your own needs. I can't promise a fast turnaround on issues or PRs — this is maintained in whatever spare time I have, not on a schedule.

## License

[MIT](./LICENSE) — do whatever you want with it.
