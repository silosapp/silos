import { useEffect, useState } from "react";
import type { AppInfo, WebApp } from "../types";
import { api } from "../api";
import { IconPicker } from "./IconPicker";
import { DEFAULT_ICON_BG } from "../colors";
import { ConfirmTyped } from "./ConfirmTyped";

interface Props {
  appId: string;
}

type Section = "info" | "icon" | "security" | "session" | "details";

export function AppSettingsView({ appId }: Props) {
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
  }, [appId]);

  useEffect(() => {
    if (app?.icon) {
      api.readIconDataUrl(app.icon).then(setIconUrl);
    } else {
      setIconUrl(undefined);
    }
  }, [app?.icon]);

  if (!app) return null;

  return (
    <div className="settings-window">
      <nav className="settings-nav">
        <button className={section === "info" ? "active" : ""} onClick={() => setSection("info")}>
          Info
        </button>
        <button className={section === "icon" ? "active" : ""} onClick={() => setSection("icon")}>
          Icona
        </button>
        <button
          className={section === "security" ? "active" : ""}
          onClick={() => setSection("security")}
        >
          Sicurezza
        </button>
        <button className={section === "session" ? "active" : ""} onClick={() => setSection("session")}>
          Sessione
        </button>
        <button className={section === "details" ? "active" : ""} onClick={() => setSection("details")}>
          Informazioni
        </button>
      </nav>

      <div className="settings-panel">
        {section === "info" && <InfoSection app={app} onChanged={refresh} />}
        {section === "icon" && <IconSection app={app} iconUrl={iconUrl} onChanged={refresh} />}
        {section === "security" && <SecuritySection app={app} onChanged={refresh} />}
        {section === "session" && <SessionSection app={app} />}
        {section === "details" && <DetailsSection app={app} />}
      </div>
    </div>
  );
}

function InfoSection({ app, onChanged }: { app: WebApp; onChanged: () => void }) {
  const [name, setName] = useState(app.name);
  const [url, setUrl] = useState(app.url);
  const [hibernateMinutes, setHibernateMinutes] = useState(String(app.hibernate_delay_secs / 60));

  useEffect(() => {
    setName(app.name);
    setUrl(app.url);
    setHibernateMinutes(String(app.hibernate_delay_secs / 60));
  }, [app.id]);

  async function saveName() {
    if (name.trim() && name.trim() !== app.name) {
      await api.renameApp(app.id, name.trim());
      onChanged();
    }
  }

  async function saveUrl() {
    if (url.trim() && url.trim() !== app.url) {
      await api.setAppUrl(app.id, url.trim());
      onChanged();
    }
  }

  async function toggleBackground(enabled: boolean) {
    await api.setAppRunInBackground(app.id, enabled);
    onChanged();
  }

  async function toggleEagerLoad(enabled: boolean) {
    await api.setAppEagerLoadSubspaces(app.id, enabled);
    onChanged();
  }

  async function saveHibernateDelay() {
    const minutes = Number(hibernateMinutes);
    if (Number.isFinite(minutes) && minutes >= 0) {
      const secs = Math.round(minutes * 60);
      if (secs !== app.hibernate_delay_secs) {
        await api.setAppHibernateDelaySecs(app.id, secs);
        onChanged();
      }
    }
  }

  return (
    <div className="settings-section">
      <h2>Info</h2>

      <label className="settings-field">
        <span>Nome app</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
      </label>

      <label className="settings-field">
        <span>URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={saveUrl} />
        <small>URL predefinito usato dai sottospazi senza un URL iniziale proprio.</small>
      </label>

      <div className="settings-field">
        <label className="settings-field-row">
          <span>Esegui in background</span>
          <input
            type="checkbox"
            checked={app.run_in_background}
            onChange={(e) => toggleBackground(e.target.checked)}
          />
        </label>
        <small>Alla chiusura, la finestra resta attiva nella tray invece di chiudersi davvero.</small>
      </div>

      <h3 className="settings-group-heading">Caricamento sottospazi</h3>

      <div className="settings-field">
        <label className="settings-field-row">
          <span>Carica subito tutti i sottospazi</span>
          <input
            type="checkbox"
            checked={app.eager_load_subspaces}
            onChange={(e) => toggleEagerLoad(e.target.checked)}
          />
        </label>
        <small>Attivo di default: tutti i sottospazi partono insieme all'app, utile per ricevere notifiche da tutti (es. più account WhatsApp). Disattivalo per caricarli solo al primo click.</small>
      </div>

      {!app.eager_load_subspaces && (
        <label className="settings-field">
          <span>Sospendi sottospazio dopo (minuti)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={hibernateMinutes}
            onChange={(e) => setHibernateMinutes(e.target.value)}
            onBlur={saveHibernateDelay}
          />
          <small>Passando a un altro sottospazio, quello lasciato viene chiuso (libera memoria) dopo questo tempo di inattività, se non ci torni prima. 0 = subito.</small>
        </label>
      )}
    </div>
  );
}

function IconSection({
  app,
  iconUrl,
  onChanged,
}: {
  app: WebApp;
  iconUrl?: string;
  onChanged: () => void;
}) {
  const [padding, setPadding] = useState(app.icon_style.padding_percent);

  useEffect(() => {
    setPadding(app.icon_style.padding_percent);
  }, [app.icon_style.padding_percent]);

  async function update(patch: Partial<WebApp["icon_style"]>) {
    const next = { ...app.icon_style, ...patch };
    await api.setAppIconStyle(app.id, next.fit, next.rounded, next.padding_percent);
    onChanged();
  }

  function commitPadding(value: number) {
    const clamped = Math.max(0, Math.min(40, Math.round(value)));
    setPadding(clamped);
    update({ padding_percent: clamped });
  }

  async function applyIcon(iconPath: string) {
    await api.setAppIcon(app.id, iconPath);
    onChanged();
  }

  async function setBackground(color: string | null) {
    await api.setAppIconBackground(app.id, color);
    onChanged();
  }

  return (
    <div className="settings-section">
      <h2>Icona</h2>
      <small>
        Icona dell'app: usata nel collegamento del menu Start. L'adattamento/bordi/padding sotto
        si applicano anche alle icone di tutti i sottospazi.
      </small>

      <div style={{ marginTop: "1rem" }}>
        <IconPicker
          iconUrl={iconUrl}
          iconPath={app.icon ?? undefined}
          rounded={app.icon_style.rounded}
          fit={app.icon_style.fit}
          background={app.icon_background_color}
          paddingPercent={padding}
          fallbackChar={app.name.charAt(0).toUpperCase()}
          searchSeed={app.name}
          onFetchFavicon={() => api.fetchAppFavicon(app.id)}
          onIconResolved={applyIcon}
        />
      </div>

      <label className="settings-field settings-field-row">
        <span>Colore sfondo</span>
        <span className="color-row">
          <input
            type="color"
            value={app.icon_background_color ?? DEFAULT_ICON_BG}
            onChange={(e) => setBackground(e.target.value)}
          />
          <button className="ghost" onClick={() => setBackground(null)}>
            Nessuno
          </button>
        </span>
      </label>

      <label className="settings-field" style={{ marginTop: "1rem" }}>
        <span>Adattamento</span>
        <select
          value={app.icon_style.fit}
          onChange={(e) => update({ fit: e.target.value as "cover" | "contain" })}
        >
          <option value="cover">Riempi (ritaglia)</option>
          <option value="contain">Originale (nessun ritaglio)</option>
        </select>
      </label>

      <label className="settings-field settings-field-row">
        <span>Bordi</span>
        <select
          value={app.icon_style.rounded ? "rounded" : "square"}
          onChange={(e) => update({ rounded: e.target.value === "rounded" })}
        >
          <option value="rounded">Arrotondati</option>
          <option value="square">Squadrati</option>
        </select>
      </label>

      <label className="settings-field" style={{ marginTop: "1rem" }}>
        <span>Padding dal bordo</span>
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
    </div>
  );
}

function SecuritySection({ app, onChanged }: { app: WebApp; onChanged: () => void }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPin = app.has_pin;

  async function enablePin() {
    setError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setError("Il PIN deve avere tra 4 e 8 cifre.");
      return;
    }
    if (pin !== confirmPin) {
      setError("I PIN inseriti non coincidono.");
      return;
    }
    try {
      await api.setAppPin(app.id, pin);
      setPin("");
      setConfirmPin("");
      onChanged();
    } catch {
      setError("Impossibile impostare il PIN.");
    }
  }

  async function removePin() {
    await api.setAppPin(app.id, null);
    onChanged();
  }

  async function toggleLockOnBackground(enabled: boolean) {
    await api.setAppPinLock(app.id, enabled, app.pin_lock_delay_secs);
    onChanged();
  }

  async function changeDelay(delaySecs: number) {
    await api.setAppPinLock(app.id, app.pin_lock_on_background, delaySecs);
    onChanged();
  }

  return (
    <div className="settings-section">
      <h2>Sicurezza</h2>
      <p>Richiedi un PIN per aprire questa app.</p>

      {hasPin ? (
        <>
          <div className="settings-danger-zone">
            <p>PIN attivo su questa app.</p>
            <button className="danger-ghost" onClick={removePin}>
              Rimuovi PIN
            </button>
          </div>

          <label className="settings-field settings-field-row" style={{ marginTop: "1rem" }}>
            <span>Blocca anche quando va in tray (background)</span>
            <input
              type="checkbox"
              checked={app.pin_lock_on_background}
              onChange={(e) => toggleLockOnBackground(e.target.checked)}
            />
          </label>

          {app.pin_lock_on_background && (
            <label className="settings-field">
              <span>Blocca dopo</span>
              <select
                value={app.pin_lock_delay_secs}
                onChange={(e) => changeDelay(Number(e.target.value))}
              >
                <option value={0}>Subito</option>
                <option value={60}>1 minuto</option>
                <option value={300}>5 minuti</option>
                <option value={600}>10 minuti</option>
              </select>
            </label>
          )}
        </>
      ) : (
        <>
          <label className="settings-field">
            <span>Nuovo PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4-8 cifre"
            />
          </label>
          <label className="settings-field">
            <span>Conferma PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="4-8 cifre"
            />
          </label>
          {error && <div className="modal-error">{error}</div>}
          <button onClick={enablePin} disabled={!pin || !confirmPin}>
            Attiva PIN
          </button>
        </>
      )}
    </div>
  );
}

function SessionSection({ app }: { app: WebApp }) {
  const [confirming, setConfirming] = useState(false);

  async function reset() {
    await api.resetAppSessions(app.id);
    setConfirming(false);
  }

  return (
    <div className="settings-section">
      <h2>Sessione</h2>
      <p>
        Reimposta tutti i sottospazi di questa app: cookie, login e cache verranno cancellati per
        ognuno di essi.
      </p>

      <div className="settings-danger-zone">
        <h3>Zona pericolosa</h3>
        {confirming ? (
          <ConfirmTyped label="Conferma reset" onConfirm={reset} onCancel={() => setConfirming(false)} />
        ) : (
          <button className="danger-ghost" onClick={() => setConfirming(true)}>
            Reimposta tutte le sessioni
          </button>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(unixSeconds: number): string {
  if (!unixSeconds) return "-";
  return new Date(unixSeconds * 1000).toLocaleDateString("it-IT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailsSection({ app }: { app: WebApp }) {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setInfo(await api.getAppInfo(app.id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [app.id]);

  return (
    <div className="settings-section">
      <h2>Informazioni</h2>

      <label className="settings-field settings-field-row">
        <span>Data di creazione</span>
        <span>{formatDate(app.created_at)}</span>
      </label>

      <label className="settings-field">
        <span>Percorso cartella</span>
        <input readOnly value={info?.folder_path ?? ""} onFocus={(e) => e.currentTarget.select()} />
      </label>

      <label className="settings-field settings-field-row">
        <span>Dimensione totale</span>
        <span>{loading ? "Calcolo..." : info ? formatBytes(info.total_size_bytes) : "-"}</span>
      </label>

      {info && info.subspaces.length > 0 && (
        <div className="settings-field" style={{ marginTop: "1rem" }}>
          <span>Dimensione per sottospazio</span>
          {info.subspaces.map((s) => (
            <div key={s.id} className="settings-field settings-field-row" style={{ marginBottom: 0 }}>
              <span>{s.name}</span>
              <span>{formatBytes(s.size_bytes)}</span>
            </div>
          ))}
        </div>
      )}

      <button className="ghost" style={{ marginTop: "1rem" }} onClick={load} disabled={loading}>
        Aggiorna
      </button>
    </div>
  );
}
