import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../api";

export function GlobalSettingsView() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getMacosIconsApiKey().then((key) => setApiKey(key ?? ""));
  }, []);

  async function save() {
    await api.setMacosIconsApiKey(apiKey.trim() || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="settings-window">
      <div className="settings-panel">
        <div className="settings-section">
          <h2>Impostazioni globali</h2>

          <label className="settings-field">
            <span>API key macOSicons</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={save}
              placeholder="Incolla qui la tua API key"
            />
            <small>
              Usata dalla ricerca icone su{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); openUrl("https://macosicons.com"); }}>
                macosicons.com
              </a>
              . Piano free: 50 ricerche/mese. Genera una chiave su{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openUrl("https://docs.macosicons.com/api-management");
                }}
              >
                docs.macosicons.com
              </a>
              .
            </small>
          </label>

          {saved && <div className="settings-saved-hint">Salvato.</div>}
        </div>
      </div>
    </div>
  );
}
