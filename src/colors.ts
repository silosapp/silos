// Default icon swatch background, matching the app's --border token and the
// backend's own default (models::default_icon_background) — kept in sync by
// hand across the Rust/TS boundary since there's no shared token file.
export const DEFAULT_ICON_BG = "#2a2a30";

// Color for a session group id, so subspaces sharing a session are visually
// identifiable by matching border colors. Assigned in encounter order using
// the golden-angle hue step, which spreads colors evenly and avoids the
// collisions a hash-mod-360 scheme can produce for unrelated group ids.
// Assignments are cached for the lifetime of the window (not persisted
// across restarts), so colors stay stable within a session but may shift
// after a reload.
const GOLDEN_ANGLE = 137.508;
const assignedHues = new Map<string, number>();
let nextHueIndex = 0;

export function sessionColor(sessionGroup: string): string {
  let hue = assignedHues.get(sessionGroup);
  if (hue === undefined) {
    hue = (nextHueIndex * GOLDEN_ANGLE) % 360;
    nextHueIndex++;
    assignedHues.set(sessionGroup, hue);
  }
  return `hsl(${hue}, 65%, 60%)`;
}
