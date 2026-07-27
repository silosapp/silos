import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../api";

type Section = "language" | "extensions";

export function GlobalSettingsView() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("language");

  return (
    <div className="settings-window">
      <nav className="settings-nav">
        <button className={section === "language" ? "active" : ""} onClick={() => setSection("language")}>
          {t("globalSettings.nav.language")}
        </button>
        <button className={section === "extensions" ? "active" : ""} onClick={() => setSection("extensions")}>
          {t("globalSettings.nav.extensions")}
        </button>
      </nav>

      <div className="settings-panel">
        {section === "language" && <LanguageSection />}
        {section === "extensions" && <ExtensionsSection />}
      </div>
    </div>
  );
}

function LanguageSection() {
  const { t, i18n } = useTranslation();

  return (
    <div className="settings-section">
      <h2>{t("globalSettings.language.title")}</h2>

      <label className="settings-field settings-field-row">
        <span>{t("globalSettings.language.languageLabel")}</span>
        <select value={i18n.language.split("-")[0]} onChange={(e) => i18n.changeLanguage(e.target.value)}>
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
  );
}

function ExtensionsSection() {
  const { t } = useTranslation();
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
    <div className="settings-section">
      <h2>{t("globalSettings.extensions.title")}</h2>

      <label className="settings-field">
        <span>{t("globalSettings.extensions.macosIconsApiKeyLabel")}</span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onBlur={save}
          placeholder={t("globalSettings.extensions.apiKeyPlaceholder")}
        />
        <small>
          {t("globalSettings.extensions.apiKeyHintPrefix")}{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); openUrl("https://macosicons.com"); }}>
            macosicons.com
          </a>
          {t("globalSettings.extensions.apiKeyHintMiddle")}{" "}
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

      {saved && <div className="settings-saved-hint">{t("globalSettings.extensions.saved")}</div>}
    </div>
  );
}
