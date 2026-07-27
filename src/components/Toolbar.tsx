import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { TabInfo } from "../types";
import { api } from "../api";

interface Props {
  appId: string;
  subspaceId: string;
}

export function Toolbar({ appId, subspaceId }: Props) {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [homeUrl, setHomeUrl] = useState<string | null>(null);

  async function refresh() {
    const [nextTabs, active] = await Promise.all([
      api.getTabs(appId, subspaceId),
      api.getActiveTab(appId, subspaceId),
    ]);
    setTabs(nextTabs);
    setActiveId(active);
  }

  useEffect(() => {
    refresh();
    const unlisten = listen("tabs-changed", refresh);
    return () => {
      unlisten.then((f) => f());
    };
  }, [appId, subspaceId]);

  useEffect(() => {
    api.listApps().then((apps) => {
      const app = apps.find((a) => a.id === appId);
      const subspace = app?.subspaces.find((s) => s.id === subspaceId);
      setHomeUrl(subspace?.start_url ?? app?.url ?? null);
    });
  }, [appId, subspaceId]);

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (activeTab && !editingUrl) {
      setUrlInput(activeTab.url);
    }
  }, [activeTab?.url, editingUrl]);

  async function handleNewTab() {
    await api.openTab(appId, subspaceId);
  }

  async function handleCloseTab(e: MouseEvent, tabId: string) {
    e.stopPropagation();
    await api.closeTab(appId, subspaceId, tabId);
  }

  async function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !urlInput.trim()) return;
    const target = /^[a-z]+:\/\//i.test(urlInput.trim()) ? urlInput.trim() : `https://${urlInput.trim()}`;
    setEditingUrl(false);
    await api.navigateTab(appId, subspaceId, activeId, target);
  }

  return (
    <div className="toolbar">
      <div className="toolbar-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`toolbar-tab ${tab.id === activeId ? "toolbar-tab-active" : ""}`}
            onClick={() => api.switchTab(appId, subspaceId, tab.id)}
            title={tab.title}
          >
            <span className="toolbar-tab-title">{tab.title || "Nuova scheda"}</span>
            {tabs.length > 1 && (
              <button className="toolbar-tab-close" onClick={(e) => handleCloseTab(e, tab.id)}>
                ×
              </button>
            )}
          </div>
        ))}
        <button className="toolbar-tab-add" onClick={handleNewTab} title="Nuova scheda">
          +
        </button>
      </div>

      <div className="toolbar-nav">
        <button
          className="ghost toolbar-nav-btn"
          onClick={() => activeId && api.tabBack(appId, subspaceId, activeId)}
          title="Indietro"
        >
          ‹
        </button>
        <button
          className="ghost toolbar-nav-btn"
          onClick={() => activeId && api.tabForward(appId, subspaceId, activeId)}
          title="Avanti"
        >
          ›
        </button>
        <button
          className="ghost toolbar-nav-btn"
          onClick={() => activeId && api.reloadTab(appId, subspaceId, activeId)}
          title="Ricarica"
        >
          ↻
        </button>
        <button
          className="ghost toolbar-nav-btn"
          disabled={!homeUrl}
          onClick={() => activeId && homeUrl && api.navigateTab(appId, subspaceId, activeId, homeUrl)}
          title="Home"
        >
          ⌂
        </button>
        <form className="toolbar-url-form" onSubmit={handleUrlSubmit}>
          <input
            value={urlInput}
            onChange={(e) => {
              setEditingUrl(true);
              setUrlInput(e.target.value);
            }}
            onFocus={() => setEditingUrl(true)}
            onBlur={() => setEditingUrl(false)}
            placeholder="Indirizzo"
          />
        </form>
      </div>
    </div>
  );
}
