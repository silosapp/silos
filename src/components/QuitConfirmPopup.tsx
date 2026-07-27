import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../api";

interface Props {
  appId: string;
}

export function QuitConfirmPopup({ appId }: Props) {
  const { t } = useTranslation();
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
      <p>{t("quitConfirm.message")}</p>
      <div className="btn-row">
        <button className="danger-ghost" onClick={confirmQuit} autoFocus>
          {t("quitConfirm.closeButton")}
        </button>
        <button className="ghost" onClick={() => getCurrentWindow().close()}>
          {t("quitConfirm.cancel")}
        </button>
      </div>
    </div>
  );
}
