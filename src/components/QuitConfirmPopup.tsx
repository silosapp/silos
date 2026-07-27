import type { KeyboardEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../api";

interface Props {
  appId: string;
}

export function QuitConfirmPopup({ appId }: Props) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") getCurrentWindow().close();
  }

  async function confirmQuit() {
    // Fire-and-forget: quitApp destroys the app window this popup is
    // anchored to, and awaiting its round-trip before closing risks the
    // popup never getting its own close message back if that coincides
    // with the target window's teardown. Closing itself doesn't need to
    // wait for quitApp to actually finish.
    api.quitApp(appId);
    await getCurrentWindow().close();
  }

  return (
    <div className="quit-confirm-popup" onKeyDown={handleKeyDown}>
      <p>Chiudere definitivamente l'app? Uscirà anche dalla tray.</p>
      <div className="btn-row">
        <button className="danger-ghost" onClick={confirmQuit} autoFocus>
          Chiudi
        </button>
        <button className="ghost" onClick={() => getCurrentWindow().close()}>
          Annulla
        </button>
      </div>
    </div>
  );
}
