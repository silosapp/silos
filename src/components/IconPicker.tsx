import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { api } from "../api";
import type { IconSourceInfo, MacIconResult } from "../types";
import { IconCropModal } from "./IconCropModal";
import { IconSizePreview } from "./IconSizePreview";

interface Props {
  iconUrl?: string;
  /// Local path backing `iconUrl` (the same path every source resolves to).
  /// Needed alongside the data URL because crop_icon operates on the file,
  /// not the already-decoded preview.
  iconPath?: string;
  rounded: boolean;
  fit: "cover" | "contain";
  background?: string | null;
  paddingPercent?: number;
  fallbackChar: string;
  /// Seed query for the macOSicons search field (site/app name).
  searchSeed: string;
  /// Resolves the site/app's favicon into a cached icon path, without
  /// persisting it anywhere yet — same contract as the other icon sources
  /// below (pickLocalIcon/pickMacosIcon/pickIconFromUrl), so every source
  /// funnels into the same `onIconResolved` regardless of context (a brand
  /// new app/subspace being drafted, or an existing one being edited).
  onFetchFavicon: () => Promise<string>;
  onIconResolved: (iconPath: string) => void;
}

/// Icon preview + the four ways to set it (favicon/local file/macOSicons
/// search/direct URL), shared by app creation, subspace creation, and both
/// "edit an existing app/subspace" settings screens — previously each had
/// its own, inconsistent subset of these.
export function IconPicker({
  iconUrl,
  iconPath,
  rounded,
  fit,
  background,
  paddingPercent = 0,
  fallbackChar,
  searchSeed,
  onFetchFavicon,
  onIconResolved,
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [macSearchOpen, setMacSearchOpen] = useState(false);
  const [urlIconOpen, setUrlIconOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<IconSourceInfo | null>(null);

  useEffect(() => {
    if (!iconPath) {
      setSourceInfo(null);
      return;
    }
    let cancelled = false;
    api.getIconSourceInfo(iconPath).then(
      (info) => {
        if (!cancelled) setSourceInfo(info);
      },
      () => {
        if (!cancelled) setSourceInfo(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [iconPath]);

  async function retryFavicon() {
    setBusy(true);
    setError(null);
    try {
      const iconPath = await onFetchFavicon();
      onIconResolved(iconPath);
    } catch {
      setError(t("iconPicker.noIconFoundError"));
    } finally {
      setBusy(false);
    }
  }

  async function pickImage() {
    const path = await open({
      multiple: false,
      filters: [{ name: t("iconPicker.imageFilterName"), extensions: ["png", "jpg", "jpeg", "gif", "webp", "ico", "svg"] }],
    });
    if (!path || Array.isArray(path)) return;
    setBusy(true);
    try {
      const iconPath = await api.pickLocalIcon(path);
      onIconResolved(iconPath);
    } finally {
      setBusy(false);
    }
  }

  /// Reads whatever image bytes are on the OS clipboard (e.g. "copy image"
  /// from a browser's right-click menu) via the clipboard-manager plugin and
  /// saves them as a fresh icon source, same contract as every other source.
  async function pasteImage() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const image = await readImage();
      const [rgba, size] = await Promise.all([image.rgba(), image.size()]);
      const iconPath = await api.saveClipboardImage(rgba, size.width, size.height);
      onIconResolved(iconPath);
    } catch {
      setError(t("iconPicker.noClipboardImageError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="icon-picker">
      <div className="icon-preview-row">
        <div className="icon-preview-col">
          <span
            className={`rail-icon settings-icon-preview ${rounded ? "" : "rail-icon-square"}`}
            style={{ background: background ?? "transparent" }}
          >
            {iconUrl ? (
              <img src={iconUrl} alt="" style={{ objectFit: fit, padding: `${paddingPercent}%` }} />
            ) : (
              <span className="rail-icon-fallback">{fallbackChar}</span>
            )}
          </span>
          {sourceInfo && (
            <span className="icon-source-info mono">
              <span>
                {sourceInfo.width}×{sourceInfo.height}
              </span>
              <span>{sourceInfo.format}</span>
              <span>{formatBytes(sourceInfo.size_bytes)}</span>
            </span>
          )}
        </div>

        <div className="icon-source-buttons">
          <button type="button" className="ghost" disabled={busy} onClick={retryFavicon}>
            {t("iconPicker.faviconButton")}
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={pickImage}>
            {t("iconPicker.chooseImageButton")}
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={pasteImage}>
            {t("iconPicker.pasteButton")}
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={() => setMacSearchOpen((v) => !v)}>
            {t("iconPicker.searchMacosIconsButton")}
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={() => setUrlIconOpen((v) => !v)}>
            {t("iconPicker.fromUrlButton")}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={busy || !iconUrl || !iconPath}
            onClick={() => setCropOpen(true)}
          >
            {t("iconPicker.cropButton")}
          </button>
        </div>
      </div>

      {error && <div className="site-confirm-error">{error}</div>}

      {iconUrl && (
        <IconSizePreview
          iconUrl={iconUrl}
          rounded={rounded}
          fit={fit}
          background={background}
          paddingPercent={paddingPercent}
        />
      )}

      {cropOpen && iconUrl && iconPath && (
        <IconCropModal
          sourcePath={iconPath}
          sourceUrl={iconUrl}
          onCancel={() => setCropOpen(false)}
          onCropped={(newPath) => {
            onIconResolved(newPath);
            setCropOpen(false);
          }}
        />
      )}

      {macSearchOpen && (
        <MacIconSearch
          initialQuery={searchSeed}
          busy={busy}
          setBusy={setBusy}
          onPicked={(iconPath) => {
            onIconResolved(iconPath);
            setMacSearchOpen(false);
          }}
        />
      )}

      {urlIconOpen && (
        <IconFromUrl
          busy={busy}
          setBusy={setBusy}
          onPicked={(iconPath) => {
            onIconResolved(iconPath);
            setUrlIconOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MacIconSearch({
  initialQuery,
  busy,
  setBusy,
  onPicked,
}: {
  initialQuery: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onPicked: (iconPath: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MacIconResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const found = await api.searchMacosIcons(query.trim());
      setResults(found);
      if (found.length === 0) setError(t("iconPicker.macSearch.noResultsError"));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function pick(result: MacIconResult) {
    setBusy(true);
    try {
      const iconPath = await api.pickMacosIcon(result.png_url);
      onPicked(iconPath);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="brand-image-search">
      <label className="settings-field">
        <span>{t("iconPicker.macSearch.label")}</span>
        <form className="brand-icon-search" onSubmit={search}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("iconPicker.macSearch.placeholder")} />
          <button type="button" className="ghost" disabled={loading || busy} onClick={search}>
            {loading ? t("iconPicker.macSearch.searching") : t("iconPicker.macSearch.searchButton")}
          </button>
        </form>
        <small>{t("iconPicker.macSearch.hint")}</small>
      </label>

      {error && <div className="site-confirm-error">{error}</div>}

      {results.length > 0 && (
        <div className="brand-image-grid">
          {results.map((r) => (
            <button
              type="button"
              key={r.png_url}
              className="brand-image-card"
              disabled={busy}
              onClick={() => pick(r)}
              title={r.credit ? `${r.app_name} — ${r.credit}` : r.app_name}
            >
              <img src={r.png_url} alt="" />
              <span className="brand-image-name">{r.app_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconFromUrl({
  busy,
  setBusy,
  onPicked,
}: {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onPicked: (iconPath: string) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function apply(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const iconPath = await api.pickIconFromUrl(url.trim());
      onPicked(iconPath);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="brand-image-search">
      <label className="settings-field">
        <span>{t("iconPicker.fromUrl.label")}</span>
        <form className="brand-icon-search" onSubmit={apply}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("iconPicker.fromUrl.placeholder")}
          />
          <button type="button" className="ghost" disabled={busy} onClick={apply}>
            {t("iconPicker.fromUrl.useButton")}
          </button>
        </form>
        <small>{t("iconPicker.fromUrl.hint")}</small>
      </label>

      {error && <div className="site-confirm-error">{error}</div>}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
