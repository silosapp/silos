import { useEffect, useState } from "react";
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
          Info
        </button>
        <button className={section === "session" ? "active" : ""} onClick={() => setSection("session")}>
          Sessione
        </button>
        <button className={section === "icon" ? "active" : ""} onClick={() => setSection("icon")}>
          Icona
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
      <h2>Info</h2>

      <label className="settings-field">
        <span>Titolo</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
      </label>

      <label className="settings-field">
        <span>URL iniziale</span>
        <input
          value={startUrl}
          onChange={(e) => setStartUrl(e.target.value)}
          onBlur={saveStartUrl}
          placeholder={app.url}
        />
        <small>Vuoto = usa l'URL dell'app ({app.url})</small>
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
      <h2>Sessione</h2>

      <label className="settings-field">
        <span>Condivisione</span>
        <select
          value={subspace.session_group === subspace.id ? "" : subspace.session_group}
          onChange={(e) => share(e.target.value || subspace.id)}
        >
          <option value="">Sessione propria</option>
          {app.subspaces
            .filter((o) => o.id !== subspace.id)
            .map((o) => (
              <option key={o.id} value={o.session_group}>
                Condividi con {o.name}
              </option>
            ))}
        </select>
        <small>I sottospazi con la stessa sessione condividono cookie e login.</small>
      </label>

      <div className="settings-danger-zone">
        <h3>Zona pericolosa</h3>

        {confirmingClear ? (
          <ConfirmTyped label="Conferma pulizia" onConfirm={clearData} onCancel={() => setConfirmingClear(false)} />
        ) : (
          <button className="ghost" onClick={() => setConfirmingClear(true)}>
            Pulisci dati sessione
          </button>
        )}

        {confirmingRemove ? (
          <ConfirmTyped
            label="Conferma eliminazione"
            onConfirm={removeSubspace}
            onCancel={() => setConfirmingRemove(false)}
          />
        ) : (
          <button className="danger-ghost" onClick={() => setConfirmingRemove(true)}>
            Elimina sottospazio
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
      <h2>Icona</h2>

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
        <span>Colore sfondo</span>
        <div className="color-row">
          <input
            type="color"
            value={subspace.icon_background_color ?? DEFAULT_ICON_BG}
            onChange={(e) => setBackground(e.target.value)}
          />
          <button className="ghost" onClick={() => setBackground(null)}>
            Nessuno
          </button>
        </div>
      </label>

      <label className="settings-field" style={{ marginTop: "1rem" }}>
        <span>Padding dal bordo</span>
        <small>Vale per le icone di tutti i sottospazi di quest'app.</small>
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

      <small>
        Adattamento e forma dell'icona si impostano per tutta l'app, nelle Impostazioni app.
      </small>
    </div>
  );
}
