import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Subspace, WebApp } from "../types";
import { api } from "../api";
import { IconPicker } from "./IconPicker";
import { DEFAULT_ICON_BG } from "../colors";
import { ConfirmTyped } from "./ConfirmTyped";

interface Props {
  appId: string;
  subspaceId: string;
}

type Section = "info" | "session" | "icon";

export function SettingsView({ appId, subspaceId }: Props) {
  const { t } = useTranslation();
  const [app, setApp] = useState<WebApp | null>(null);
  const [section, setSection] = useState<Section>("info");
  const [iconUrl, setIconUrl] = useState<string | undefined>();

  async function refresh() {
    const apps = await api.listApps();
    const found = apps.find((a) => a.id === appId) ?? null;
    setApp(found);
    return found;
  }

  useEffect(() => {
    refresh();
  }, [appId, subspaceId]);

  const subspace = app?.subspaces.find((s) => s.id === subspaceId) ?? null;

  const effectiveIcon = subspace?.icon ?? app?.icon ?? undefined;

  useEffect(() => {
    if (effectiveIcon) {
      api.readIconDataUrl(effectiveIcon).then(setIconUrl);
    } else {
      setIconUrl(undefined);
    }
  }, [effectiveIcon]);

  if (!app || !subspace) return null;

  return (
    <div className="settings-window">
      <nav className="settings-nav">
        <button className={section === "info" ? "active" : ""} onClick={() => setSection("info")}>
          {t("settingsView.nav.info")}
        </button>
        <button className={section === "session" ? "active" : ""} onClick={() => setSection("session")}>
          {t("settingsView.nav.session")}
        </button>
        <button className={section === "icon" ? "active" : ""} onClick={() => setSection("icon")}>
          {t("settingsView.nav.icon")}
        </button>
      </nav>

      <div className="settings-panel">
        {section === "info" && (
          <InfoSection app={app} subspace={subspace} onChanged={refresh} />
        )}
        {section === "session" && (
          <SessionSection app={app} subspace={subspace} onChanged={refresh} />
        )}
        {section === "icon" && (
          <IconSection
            app={app}
            subspace={subspace}
            iconUrl={iconUrl}
            iconPath={effectiveIcon}
            onChanged={refresh}
          />
        )}
      </div>
    </div>
  );
}

function InfoSection({
  app,
  subspace,
  onChanged,
}: {
  app: WebApp;
  subspace: Subspace;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(subspace.name);
  const [startUrl, setStartUrl] = useState(subspace.start_url ?? "");

  useEffect(() => {
    setName(subspace.name);
    setStartUrl(subspace.start_url ?? "");
  }, [subspace.id]);

  async function saveName() {
    if (name.trim() && name.trim() !== subspace.name) {
      await api.renameSubspace(app.id, subspace.id, name.trim());
      onChanged();
    }
  }

  async function saveStartUrl() {
    const trimmed = startUrl.trim();
    await api.setSubspaceStartUrl(app.id, subspace.id, trimmed || null);
    onChanged();
  }

  return (
    <div className="settings-section">
      <h2>{t("settingsView.info.title")}</h2>

      <label className="settings-field">
        <span>{t("settingsView.info.titleLabel")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
      </label>

      <label className="settings-field">
        <span>{t("settingsView.info.startUrlLabel")}</span>
        <input
          value={startUrl}
          onChange={(e) => setStartUrl(e.target.value)}
          onBlur={saveStartUrl}
          placeholder={app.url}
        />
        <small>{t("settingsView.info.startUrlHint", { url: app.url })}</small>
      </label>
    </div>
  );
}

function SessionSection({
  app,
  subspace,
  onChanged,
}: {
  app: WebApp;
  subspace: Subspace;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  async function share(targetGroup: string) {
    await api.setSubspaceSessionGroup(app.id, subspace.id, targetGroup);
    onChanged();
  }

  async function clearData() {
    await api.clearSubspaceData(app.id, subspace.id);
    setConfirmingClear(false);
  }

  async function removeSubspace() {
    await api.deleteSubspace(app.id, subspace.id);
    await getCurrentWindow().close();
  }

  return (
    <div className="settings-section">
      <h2>{t("settingsView.session.title")}</h2>

      <label className="settings-field">
        <span>{t("settingsView.session.sharingLabel")}</span>
        <select
          value={subspace.session_group === subspace.id ? "" : subspace.session_group}
          onChange={(e) => share(e.target.value || subspace.id)}
        >
          <option value="">{t("settingsView.session.ownSession")}</option>
          {app.subspaces
            .filter((o) => o.id !== subspace.id)
            .map((o) => (
              <option key={o.id} value={o.session_group}>
                {t("settingsView.session.shareWith", { name: o.name })}
              </option>
            ))}
        </select>
        <small>{t("settingsView.session.sharingHint")}</small>
      </label>

      <div className="settings-danger-zone">
        <h3>{t("settingsView.session.dangerZone")}</h3>

        {confirmingClear ? (
          <ConfirmTyped label={t("settingsView.session.confirmClear")} onConfirm={clearData} onCancel={() => setConfirmingClear(false)} />
        ) : (
          <button className="ghost" onClick={() => setConfirmingClear(true)}>
            {t("settingsView.session.clearDataButton")}
          </button>
        )}

        {confirmingRemove ? (
          <ConfirmTyped
            label={t("settingsView.session.confirmDelete")}
            onConfirm={removeSubspace}
            onCancel={() => setConfirmingRemove(false)}
          />
        ) : (
          <button className="danger-ghost" onClick={() => setConfirmingRemove(true)}>
            {t("settingsView.session.deleteSubspaceButton")}
          </button>
        )}
      </div>
    </div>
  );
}

function IconSection({
  app,
  subspace,
  iconUrl,
  iconPath,
  onChanged,
}: {
  app: WebApp;
  subspace: Subspace;
  iconUrl?: string;
  iconPath?: string;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [padding, setPadding] = useState(app.icon_style.padding_percent);

  useEffect(() => {
    setPadding(app.icon_style.padding_percent);
  }, [app.icon_style.padding_percent]);

  async function applyIcon(iconPath: string) {
    await api.setSubspaceIcon(app.id, subspace.id, iconPath);
    onChanged();
  }

  async function setBackground(color: string | null) {
    await api.setSubspaceIconBackground(app.id, subspace.id, color);
    onChanged();
  }

  function commitPadding(value: number) {
    const clamped = Math.max(0, Math.min(40, Math.round(value)));
    setPadding(clamped);
    api.setAppIconStyle(app.id, app.icon_style.fit, app.icon_style.rounded, clamped).then(onChanged);
  }

  return (
    <div className="settings-section">
      <h2>{t("settingsView.icon.title")}</h2>

      <IconPicker
        iconUrl={iconUrl}
        iconPath={iconPath}
        rounded={app.icon_style.rounded}
        fit={app.icon_style.fit}
        paddingPercent={padding}
        background={subspace.icon_background_color ?? app.icon_background_color}
        fallbackChar={subspace.name.charAt(0).toUpperCase()}
        searchSeed={subspace.name}
        onFetchFavicon={() => api.fetchSubspaceFavicon(app.id, subspace.id)}
        onIconResolved={applyIcon}
      />

      <label className="settings-field settings-field-row">
        <span>{t("settingsView.icon.backgroundColorLabel")}</span>
        <div className="color-row">
          <input
            type="color"
            value={subspace.icon_background_color ?? DEFAULT_ICON_BG}
            onChange={(e) => setBackground(e.target.value)}
          />
          <button className="ghost" onClick={() => setBackground(null)}>
            {t("settingsView.icon.noneButton")}
          </button>
        </div>
      </label>

      <label className="settings-field" style={{ marginTop: "1rem" }}>
        <span>{t("settingsView.icon.paddingLabel")}</span>
        <small>{t("settingsView.icon.paddingHint")}</small>
        <span className="icon-padding-row">
          <input
            type="range"
            min={0}
            max={40}
            value={padding}
            onChange={(e) => commitPadding(Number(e.target.value))}
          />
          <input
            type="number"
            min={0}
            max={40}
            value={padding}
            onChange={(e) => commitPadding(Number(e.target.value))}
          />
          <span className="icon-padding-unit">%</span>
        </span>
      </label>

      <small>{t("settingsView.icon.shapeHint")}</small>
    </div>
  );
}
