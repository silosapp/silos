---
name: Silos
description: Portable desktop app builder that turns websites into multi-account, multi-session desktop apps
colors:
  bg: "#18191b"
  surface: "#212325"
  surface-hover: "#2b2d30"
  border: "#35373a"
  text: "#ece9e4"
  text-muted: "#96999c"
  accent: "#2f6bff"
  accent-hover: "#285bd9"
  accent-soft: "#2f6bff1f"
  accent-ink: "#ffffff"
  danger: "#d9483a"
  danger-soft: "#d9483a1f"
  icon-fill: "#2b2d30"
  icon-ink: "#2f6bff"
  modal-scrim: "#000000b3"
typography:
  display:
    fontFamily: "Archivo, Inter, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, Inter, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
  mono:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
  tiny:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 600
  compact-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  icon-glyph:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  icon: "4px"
  xl: "6px"
  xxl: "8px"
  pill: "6px"
spacing:
  xs: "0.3rem"
  sm: "0.6rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#18191b"
    rounded: "{rounded.md}"
    padding: "0.55em 1em"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
  button-danger-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.55em 0.8em"
  app-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xxl}"
    padding: "1.3rem"
  rail-icon:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    size: "44px"
---

# Design System: Silos

## 1. Overview

**Creative North Star: "The Departure Board"**

Silos is a switching instrument, not a browser. Every screen answers one question fast: which account, which session, am I in right now. The system reads as a split-flap departure board — matte anthracite panels, square-cut edges, a single logo blue for "this is live," and a precise mechanical mono for anything literal (URLs, IDs). No glow, no gradient, no soft elevation: state changes read like a flap flipping, not a light turning on. Built for someone who isn't technical but needs to trust the tool completely, at a glance, without ceremony.

This system explicitly rejects generic Electron-wrapper bloat: heavy chrome, redundant toolbars, decorative gradients, glass panels pretending to be depth. It also rejects looking like a browser skin — no tab-strip cosplay of Chrome, no address-bar-as-hero, and no neon-instrument-panel glow either. Silos is its own instrument, and a quiet one.

**Key Characteristics:**
- Matte anthracite tonal surfaces (bg → surface → surface-hover), no pure black, no gradients anywhere, not even on the icon-fallback badge
- A single accent (logo blue, #2f6bff) spent sparingly: active states, primary actions, focus — always a flat fill, never a glow or ring
- Archivo for anything identifying (titles, app names, icon initials); IBM Plex Mono for anything literal (URLs) — the mono carries the "tracking number" read, not the "hacker terminal" one
- Flat by default; the only motion cue is a hard flip-style opacity/transform swap, never a soft fade or scale
- Square-cut, low-radius controls (2-8px) — a departure board, not a rounded app-store tile

## 2. Colors

A matte anthracite ramp carries the whole surface; one logo blue accent marks action and identity. No secondary or tertiary role — Primary + Neutral only, so the accent keeps its rarity and never drifts toward "warning light."

### Primary
- **Silos Blue** (#2f6bff): the one accent. Active rail state, primary buttons, active tab underline, active settings nav item, focus outlines. Always a flat fill or 2px line — never a soft glow, ring, or gradient stop.
- **Silos Blue Hover** (#285bd9): hover/pressed state of the accent, a direct swap, never a tint.
- **Silos Blue Soft** (#2f6bff @ 12% alpha): background wash for "currently selected" chrome (active toolbar tab, active settings nav row) where a full fill would be too loud.

### Neutral
- **Slate** (#18191b): app background, modal box background, rail icon backing — the deepest layer.
- **Panel** (#212325): surface layer for cards, sidebar rail, toolbar, settings nav — one step up from Slate.
- **Panel Hover** (#2b2d30): hover state for any interactive row on a Panel surface; also the icon-fallback badge fill.
- **Hairline** (#35373a): all borders and dividers. Never higher-contrast than this; borders separate, they don't decorate.
- **Chalk** (#ece9e4): primary text — a warm-white "flap card" white, not clinical pure-white.
- **Quiet Gray** (#96999c): secondary/meta text — URLs, hints, timestamps, inactive nav labels. Passes 4.5:1 on both Slate and Panel.
- **Alert Red** (#d9483a) / **Alert Red Soft** (#d9483a @ 12% alpha): destructive actions and errors only (delete app, danger-zone, PIN error).

### Named Rules
**The One Accent Rule.** Silos Blue is the only saturated color in the system. If a second saturated hue shows up anywhere outside the app's own favicon/brand-icon artwork, it's a bug, not a feature.
**The No-Glow Rule.** Silos Blue never renders as `box-shadow` blur, `filter: drop-shadow`, or a gradient stop. State reads through flat fill, a 2px line, or an opacity swap — the board metaphor is mechanical, not luminous.

## 3. Typography

**Display Font:** Archivo (with Inter, sans-serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono, monospace

**Character:** Archivo's grotesk, slightly condensed forms give identity elements (page titles, app names, icon-fallback initials) the stenciled, mechanically-set feel of a board headline; Inter carries everything else with plain legibility. IBM Plex Mono marks anything that is a literal machine value (a URL) so the eye separates "what this is called" from "where it actually points" — read as a tracking code, not a terminal prompt.

### Hierarchy
- **Display** (700, 1.6rem, 1.15 line-height, -0.01em): dashboard/window page titles only. One per screen.
- **Title** (600, 1.15rem, 1.25 line-height, -0.01em): settings section headings, modal headings, and icon-fallback initials (rail icon, app card icon) at the same weight/size.
- **Subtitle** (400, 0.9rem): the one-line description under a page title (e.g. the Dashboard header's tagline). Quiet Gray.
- **Body** (400, 15px base, 1.5 line-height): all running text and descriptions; max ~70ch where prose wraps.
- **Meta** (600, 0.85rem): secondary identifying text one step down from Body — rail row names, danger-zone headings, modal copy. Distinct from Label (which is always paired with a form field).
- **Label** (600, 0.8rem): field labels, settings field spans, toolbar tab titles — always paired with Quiet Gray color, never body text color.
- **Mono** (500, 0.72rem): app/site URLs everywhere they appear (app card, rail row). Always Quiet Gray unless it's the active/focused element.
- **Tiny** (600, 0.68rem): the smallest UI caption, reserved for the brand-icon picker's thumbnail names.
- **Compact Title** (600, 1rem): a card or modal's primary label one step below Title — app card names, modal headings.
- **Icon Glyph** (400, 1.1rem): the single-character glyph inside icon-only buttons (nav arrows, add/close controls, the add-space ghost icon) — one size for every glyph button in the system, regardless of the button's own footprint.

### Named Rules
**The Literal-Value Rule.** Anything that is a URL, host, or other machine-literal value renders in IBM Plex Mono at Quiet Gray. Anything that is a name a human chose (app name, subspace label) renders in Archivo or Inter at full text color. This pairing is how the UI distinguishes "identity" from "address" without extra labels.

## 4. Elevation

Silos is flat by default and conveys depth through tonal layering (Slate → Panel → Panel Hover), not shadows and not glow. The only state-change cue is a hard, instant swap — a border or fill flipping to Silos Blue, the way a split-flap character flips into place — never a soft ring or blur.

### State Vocabulary
- **Active-line** (`border-bottom: 2px solid var(--accent)` or full `border-color: var(--accent)`): marks the active sidebar rail row, active toolbar tab, active settings nav item. A hard line, not a glow — it reads as "this flap is showing," nothing more.
- **Modal-scrim** (`background: #000000b3` on the overlay, no shadow on the box itself): the modal box relies on its border + Slate background, not a shadow, to read as foreground.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The only elevation signal in the entire system is the active-line; if a new component reaches for `box-shadow` or `filter: drop-shadow` for anything, reconsider — a border-color or background-tint change almost always says it better here.

## 5. Components

### Buttons
- **Shape:** 4px radius (`rounded.md`) is the default — square-cut, board-ticket edges, not rounded app-tile edges. Small square icon buttons (toolbar add/nav) step down to `rounded.xs` (2px); the toolbar URL input uses `rounded.pill` (6px), a soft rectangle, never a full capsule.
- **Primary:** Silos Blue background, white (#ffffff) text for contrast on the fill, 0.55em 1em padding, 500 weight. This is the default `<button>` — primary is the unmarked case, not a variant class.
- **Hover:** direct background swap to Silos Blue Hover, 0.1s linear — no scale, no shadow, no ease-bounce.
- **Ghost:** transparent background, Quiet Gray text, Hairline border; hover fills Panel Hover and text goes full Chalk.
- **Danger Ghost:** transparent background, Alert Red text, Alert Red Soft border; hover fills Alert Red Soft.
- **Focus:** every interactive control gets a 2px Silos Blue outline at 1px offset — never suppressed, this is the keyboard-navigation backbone for switching subspaces fast.

### Cards / Containers
- **App Card** (dashboard grid): Panel background, Hairline border, 8px radius, 1.3rem padding. Hover flips the border to Silos Blue — no lift, no translateY, no shadow; the hard line change is the only hover signal, matching the no-glow, no-motion-flourish mandate.
- **Search Card** (site-search wrapper): same Panel/Hairline/8px treatment, sets the "add a new app" flow apart from the grid beneath it.
- **Empty State:** dashed Hairline border, 6px radius, centered Quiet Gray text — deliberately quieter than a real card so it never competes with actual app cards.
- **Modal Box:** Slate background (one shade darker than the page it floats over), Hairline border, 6px radius, no shadow (see Elevation).

### Inputs / Fields
- **Style:** Panel background, Hairline border, 4px radius, Inter body text.
- **Focus:** 2px Silos Blue outline, 1px offset — identical treatment to buttons, so focus is predictable everywhere.
- **Placeholder:** Quiet Gray (must stay at the 4.5:1 body-text contrast floor, not a lighter tint).

### Navigation — Sidebar Rail
- **Style:** Panel background, Hairline right border, vertical icon rail (44px icons), collapses to icon-only or expands to icon+name+URL.
- **Row states:** transparent at rest; Panel Hover background on hover or when active (`rail-row-active`); the icon itself gets a hard Silos Blue bottom-border (2px) only when that subspace is the current one — no ring, no glow.
- **Icon fallback:** Archivo initials (Title size, 1.15rem) in Silos Blue on a flat Panel Hover badge — no gradient anywhere in this system, including the fallback badge. The badge corners use `rounded.icon` (4px), matching the system's square-cut language.
- **Add-space affordance:** dashed Hairline border ghost icon at the rail's bottom, filling Panel Hover on hover — visually lighter than real rail rows so it never gets mistaken for an existing space.

### Named Rules
**The Flat-Icon Rule.** The fallback-icon badge is a plain Panel Hover fill with Silos Blue initials — never a gradient, even as a "brand flourish." The moment a real favicon is available, the badge is replaced entirely; see `.app-card-icon` vs `.app-card-icon-fallback`.

### Navigation — Toolbar Tabs
- **Style:** Slate-background tabs with Hairline border, top corners only rounded (4px), sitting on the Panel toolbar background — reads like a real tab strip attached to content, not a browser chrome pastiche.
- **Active tab:** Silos Blue Soft background + solid Silos Blue bottom border — the softest of the three accent treatments in the system, because it's competing for attention with many sibling tabs at once.
- **Close button:** 16px ghost icon button, Alert Red Soft on hover.

### Settings Navigation
- **Style:** vertical list, ghost buttons, left-aligned, Quiet Gray text at rest.
- **Active:** Silos Blue Soft background, Silos Blue text — same accent-soft language as toolbar tabs, so "you are here" reads identically across every nav pattern in the app.

## 6. Do's and Don'ts

### Do:
- **Do** keep the sidebar rail (or its equivalent) the fastest path to switch subspaces — it's the strategic center of the product, not a secondary nav.
- **Do** spend Silos Blue only on active/primary signals: rail-active line, primary buttons, active tab/nav, focus rings. Everything else stays neutral.
- **Do** render every URL/host in IBM Plex Mono at Quiet Gray; render every human-chosen name in Archivo/Inter at full text color.
- **Do** keep radii in the 2–8px band and padding tight (0.4–1.3rem) — a dense, square-cut control panel, not a spacious rounded marketing layout.
- **Do** keep focus-visible outlines on every control; keyboard switching between subspaces is a real workflow, not an afterthought.

### Don't:
- **Don't** add drop shadows, glows, glass/blur panels, or soft "elevated card" treatments — this system stays flat, full stop (see The Flat-By-Default Rule and The No-Glow Rule).
- **Don't** introduce a second saturated accent color, or any gradient, anywhere in the system (see The One Accent Rule and The Flat-Icon Rule).
- **Don't** build a tab strip, address bar, or overall chrome that reads as "a browser with a new coat of paint" — Silos must feel like its own dedicated instrument, never a Chrome/Edge cosplay.
- **Don't** reach for heavy, generic "Electron app" scaffolding — no redundant toolbars, no oversized whitespace, no decorative gradients.
- **Don't** use border-left/border-right colored stripes as accents on cards or list rows; state is communicated by full border-color, background-soft fills, or the active-line, never a stripe.
- **Don't** use eased, bouncy, or scale-based hover/active motion — transitions are instant or linear, like a flap flipping, never a soft spring.
- **Don't** let placeholder or muted text drop below the 4.5:1 contrast floor against its surface (Slate or Panel) — Quiet Gray (#96999c) is already tuned to pass; don't lighten it further "for elegance."
