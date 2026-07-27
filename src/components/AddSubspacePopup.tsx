import { KeyboardEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../api";
import { SiteSearch } from "./SiteSearch";
import type { ConfirmResult } from "./SiteSearch";
import type { SessionGroupInfo, WebApp } from "../types";

interface Props {
  appId: string;
}

const ISOLATED = "__isolated__";

export function AddSubspacePopup({ appId }: Props) {
  const { t } = useTranslation();
  const [app, setApp] = useState<WebApp | null>(null);
  const [groups, setGroups] = useState<SessionGroupInfo[]>([]);
  const [sessionChoice, setSessionChoice] = useState(ISOLATED);

  useEffect(() => {
    api.listApps().then((apps) => setApp(apps.find((a) => a.id === appId) ?? null));
    api.listSessionGroups(appId).then(setGroups);
  }, [appId]);

  async function handleConfirm({ name, url, icon, background }: ConfirmResult) {
    if (!app) return;
    const startUrl = url.trim() && url.trim() !== app.url ? url.trim() : null;
    const sessionGroup = sessionChoice === ISOLATED ? null : sessionChoice;
    await api.createSubspace(appId, name, startUrl, icon, sessionGroup, background);
    await getCurrentWindow().close();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") getCurrentWindow().close();
  }

  if (!app) return null;

  return (
    <div className="add-popup" onKeyDown={handleKeyDown}>
      <SiteSearch
        initial={{ name: app.name, url: app.url, icon: app.icon }}
        searchPlaceholder={t("addSubspacePopup.searchPlaceholder")}
        confirmLabel={t("addSubspacePopup.createLabel")}
        showBackground
        defaultBackground={app.icon_background_color}
        onConfirm={handleConfirm}
        onCancel={() => getCurrentWindow().close()}
        extraFields={
          <label className="settings-field">
            <span>{t("addSubspacePopup.sessionLabel")}</span>
            <select value={sessionChoice} onChange={(e) => setSessionChoice(e.target.value)}>
              <option value={ISOLATED}>{t("addSubspacePopup.isolatedSession")}</option>
              {groups.map((g) => (
                <option key={g.group} value={g.group}>
                  {t("addSubspacePopup.sharedSessionWith", { label: g.label })}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  );
}
