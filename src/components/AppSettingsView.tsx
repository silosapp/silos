import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
          {t("appSettings.nav.info")}
        </button>
        <button className={section === "icon" ? "active" : ""} onClick={() => setSection("icon")}>
          {t("appSettings.nav.icon")}
        </button>
        <button
          className={section === "security" ? "active" : ""}
          onClick={() => setSection("security")}
        >
          {t("appSettings.nav.security")}
        </button>
        <button className={section === "session" ? "active" : ""} onClick={() => setSection("session")}>
          {t("appSettings.nav.session")}
        </button>
        <button className={section === "details" ? "active" : ""} onClick={() => setSection("details")}>
          {t("appSettings.nav.details")}
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
  const { t } = useTranslation();
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
      <h2>{t("appSettings.info.title")}</h2>

      <label className="settings-field">
        <span>{t("appSettings.info.nameLabel")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
      </label>

      <label className="settings-field">
        <span>{t("appSettings.info.urlLabel")}</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={saveUrl} />
        <small>{t("appSettings.info.urlHint")}</small>
      </label>

      <div className="settings-field">
        <label className="settings-field-row">
          <span>{t("appSettings.info.runInBackgroundLabel")}</span>
          <input
            type="checkbox"
            checked={app.run_in_background}
            onChange={(e) => toggleBackground(e.target.checked)}
          />
        </label>
        <small>{t("appSettings.info.runInBackgroundHint")}</small>
      </div>

      <h3 className="settings-group-heading">{t("appSettings.info.subspaceLoadingHeading")}</h3>

      <div className="settings-field">
        <label className="settings-field-row">
          <span>{t("appSettings.info.eagerLoadLabel")}</span>
          <input
            type="checkbox"
            checked={app.eager_load_subspaces}
            onChange={(e) => toggleEagerLoad(e.target.checked)}
          />
        </label>
        <small>{t("appSettings.info.eagerLoadHint")}</small>
      </div>

      {!app.eager_load_subspaces && (
        <label className="settings-field">
          <span>{t("appSettings.info.hibernateDelayLabel")}</span>
          <input
            type="number"
            min={0}
            step={1}
            value={hibernateMinutes}
            onChange={(e) => setHibernateMinutes(e.target.value)}
            onBlur={saveHibernateDelay}
          />
          <small>{t("appSettings.info.hibernateDelayHint")}</small>
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
  const { t } = useTranslation();
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
      <h2>{t("appSettings.icon.title")}</h2>
      <small>{t("appSettings.icon.hint")}</small>

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
        <span>{t("appSettings.icon.backgroundColorLabel")}</span>
        <span className="color-row">
          <input
            type="color"
            value={app.icon_background_color ?? DEFAULT_ICON_BG}
            onChange={(e) => setBackground(e.target.value)}
          />
          <button className="ghost" onClick={() => setBackground(null)}>
            {t("appSettings.icon.noneButton")}
          </button>
        </span>
      </label>

      <label className="settings-field" style={{ marginTop: "1rem" }}>
        <span>{t("appSettings.icon.fitLabel")}</span>
        <select
          value={app.icon_style.fit}
          onChange={(e) => update({ fit: e.target.value as "cover" | "contain" })}
        >
          <option value="cover">{t("appSettings.icon.fitCover")}</option>
          <option value="contain">{t("appSettings.icon.fitContain")}</option>
        </select>
      </label>

      <label className="settings-field settings-field-row">
        <span>{t("appSettings.icon.bordersLabel")}</span>
        <select
          value={app.icon_style.rounded ? "rounded" : "square"}
          onChange={(e) => update({ rounded: e.target.value === "rounded" })}
        >
          <option value="rounded">{t("appSettings.icon.bordersRounded")}</option>
          <option value="square">{t("appSettings.icon.bordersSquare")}</option>
        </select>
      </label>

      <label className="settings-field" style={{ marginTop: "1rem" }}>
        <span>{t("appSettings.icon.paddingLabel")}</span>
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
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPin = app.has_pin;

  async function enablePin() {
    setError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setError(t("appSettings.security.pinLengthError"));
      return;
    }
    if (pin !== confirmPin) {
      setError(t("appSettings.security.pinMismatchError"));
      return;
    }
    try {
      await api.setAppPin(app.id, pin);
      setPin("");
      setConfirmPin("");
      onChanged();
    } catch {
      setError(t("appSettings.security.pinSetError"));
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

  async function toggleIgnoreCertificateErrors(enabled: boolean) {
    await api.setAppIgnoreCertificateErrors(app.id, enabled);
    onChanged();
  }

  return (
    <div className="settings-section">
      <h2>{t("appSettings.security.title")}</h2>
      <p>{t("appSettings.security.pinIntro")}</p>

      {hasPin ? (
        <>
          <div className="settings-danger-zone">
            <p>{t("appSettings.security.pinActive")}</p>
            <button className="danger-ghost" onClick={removePin}>
              {t("appSettings.security.removePin")}
            </button>
          </div>

          <label className="settings-field settings-field-row" style={{ marginTop: "1rem" }}>
            <span>{t("appSettings.security.lockOnBackgroundLabel")}</span>
            <input
              type="checkbox"
              checked={app.pin_lock_on_background}
              onChange={(e) => toggleLockOnBackground(e.target.checked)}
            />
          </label>

          {app.pin_lock_on_background && (
            <label className="settings-field">
              <span>{t("appSettings.security.lockDelayLabel")}</span>
              <select
                value={app.pin_lock_delay_secs}
                onChange={(e) => changeDelay(Number(e.target.value))}
              >
                <option value={0}>{t("appSettings.security.lockDelayImmediate")}</option>
                <option value={60}>{t("appSettings.security.lockDelay1Min")}</option>
                <option value={300}>{t("appSettings.security.lockDelay5Min")}</option>
                <option value={600}>{t("appSettings.security.lockDelay10Min")}</option>
              </select>
            </label>
          )}
        </>
      ) : (
        <>
          <label className="settings-field">
            <span>{t("appSettings.security.newPinLabel")}</span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t("appSettings.security.pinPlaceholder")}
            />
          </label>
          <label className="settings-field">
            <span>{t("appSettings.security.confirmPinLabel")}</span>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder={t("appSettings.security.pinPlaceholder")}
            />
          </label>
          {error && <div className="modal-error">{error}</div>}
          <button onClick={enablePin} disabled={!pin || !confirmPin}>
            {t("appSettings.security.enablePinButton")}
          </button>
        </>
      )}

      <h3 className="settings-group-heading">{t("appSettings.security.tlsHeading")}</h3>

      <div className="settings-field">
        <label className="settings-field-row">
          <span>{t("appSettings.security.ignoreCertErrorsLabel")}</span>
          <input
            type="checkbox"
            checked={app.ignore_certificate_errors}
            onChange={(e) => toggleIgnoreCertificateErrors(e.target.checked)}
          />
        </label>
        <small>{t("appSettings.security.ignoreCertErrorsHint")}</small>
      </div>
    </div>
  );
}

function SessionSection({ app }: { app: WebApp }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  async function reset() {
    await api.resetAppSessions(app.id);
    setConfirming(false);
  }

  return (
    <div className="settings-section">
      <h2>{t("appSettings.session.title")}</h2>
      <p>{t("appSettings.session.hint")}</p>

      <div className="settings-danger-zone">
        <h3>{t("appSettings.session.dangerZone")}</h3>
        {confirming ? (
          <ConfirmTyped label={t("appSettings.session.confirmReset")} onConfirm={reset} onCancel={() => setConfirming(false)} />
        ) : (
          <button className="danger-ghost" onClick={() => setConfirming(true)}>
            {t("appSettings.session.resetAllButton")}
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

function formatDate(unixSeconds: number, locale: string, unknownLabel: string): string {
  if (!unixSeconds) return unknownLabel;
  return new Date(unixSeconds * 1000).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailsSection({ app }: { app: WebApp }) {
  const { t, i18n } = useTranslation();
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
      <h2>{t("appSettings.details.title")}</h2>

      <label className="settings-field settings-field-row">
        <span>{t("appSettings.details.createdAtLabel")}</span>
        <span>{formatDate(app.created_at, i18n.language, t("appSettings.details.unknownDate"))}</span>
      </label>

      <label className="settings-field">
        <span>{t("appSettings.details.folderPathLabel")}</span>
        <input readOnly value={info?.folder_path ?? ""} onFocus={(e) => e.currentTarget.select()} />
      </label>

      <label className="settings-field settings-field-row">
        <span>{t("appSettings.details.totalSizeLabel")}</span>
        <span>{loading ? t("appSettings.details.calculating") : info ? formatBytes(info.total_size_bytes) : t("appSettings.details.unknownDate")}</span>
      </label>

      {info && info.subspaces.length > 0 && (
        <div className="settings-field" style={{ marginTop: "1rem" }}>
          <span>{t("appSettings.details.perSubspaceSizeLabel")}</span>
          {info.subspaces.map((s) => (
            <div key={s.id} className="settings-field settings-field-row" style={{ marginBottom: 0 }}>
              <span>{s.name}</span>
              <span>{formatBytes(s.size_bytes)}</span>
            </div>
          ))}
        </div>
      )}

      <button className="ghost" style={{ marginTop: "1rem" }} onClick={load} disabled={loading}>
        {t("appSettings.details.refreshButton")}
      </button>
    </div>
  );
}
