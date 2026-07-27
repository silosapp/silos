import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../api";
import { changeLanguageEverywhere } from "../i18n";

type Section = "language" | "extensions";
type ToastFn = (message: string, type?: "success" | "error") => void;

export function GlobalSettingsView() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("language");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

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
        {section === "language" && <LanguageSection onToast={showToast} />}
        {section === "extensions" && <ExtensionsSection onToast={showToast} />}
      </div>

      {toast && (
        <div className={`toast${toast.type === "error" ? " toast-error" : ""}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

function LanguageSection({ onToast }: { onToast: ToastFn }) {
  const { t, i18n } = useTranslation();
  const current = i18n.language.split("-")[0];
  const [draft, setDraft] = useState(current);

  const isDirty = draft !== current;

  function save() {
    try {
      changeLanguageEverywhere(draft);
      onToast(t("common.saved"));
    } catch {
      onToast(t("common.saveError"), "error");
    }
  }

  return (
    <div className="settings-section">
      <h2>{t("globalSettings.language.title")}</h2>

      <label className="settings-field settings-field-row">
        <span>{t("globalSettings.language.languageLabel")}</span>
        <select value={draft} onChange={(e) => setDraft(e.target.value)}>
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </label>

      {isDirty && (
        <div className="settings-actions">
          <button onClick={save}>{t("common.save")}</button>
          <button className="ghost" onClick={() => setDraft(current)}>
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

function ExtensionsSection({ onToast }: { onToast: ToastFn }) {
  const { t } = useTranslation();
  const [savedApiKey, setSavedApiKey] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    api.getMacosIconsApiKey().then((key) => {
      setSavedApiKey(key ?? "");
      setApiKey(key ?? "");
    });
  }, []);

  const isDirty = apiKey !== savedApiKey;

  async function save() {
    try {
      await api.setMacosIconsApiKey(apiKey.trim() || null);
      setSavedApiKey(apiKey);
      onToast(t("common.saved"));
    } catch {
      onToast(t("common.saveError"), "error");
    }
  }

  function cancel() {
    setApiKey(savedApiKey);
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

      {isDirty && (
        <div className="settings-actions">
          <button onClick={save}>{t("common.save")}</button>
          <button className="ghost" onClick={cancel}>
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
