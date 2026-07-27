import { KeyboardEvent, useEffect, useState } from "react";
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
        searchPlaceholder="Cerca sito per il sottospazio"
        confirmLabel="Crea"
        showBackground
        defaultBackground={app.icon_background_color}
        onConfirm={handleConfirm}
        onCancel={() => getCurrentWindow().close()}
        extraFields={
          <label className="settings-field">
            <span>Sessione</span>
            <select value={sessionChoice} onChange={(e) => setSessionChoice(e.target.value)}>
              <option value={ISOLATED}>Isolata (nuova)</option>
              {groups.map((g) => (
                <option key={g.group} value={g.group}>
                  Condivisa con: {g.label}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  );
}
