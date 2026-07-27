import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IconStyle, Subspace, WebApp } from "../types";
import { sessionColor } from "../colors";
import { api } from "../api";
import { GearIcon, HomeIcon, PowerIcon } from "./icons";

interface Props {
  appId: string;
}

export function AppSidebar({ appId }: Props) {
  const { t } = useTranslation();
  const [app, setApp] = useState<WebApp | null>(null);
  const [activeSubspaceId, setActiveSubspaceId] = useState<string | null>(null);
  const [iconCache, setIconCache] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Distance threshold, not a delay: without it every plain click would also
  // register as a drag attempt, so onClick (select subspace) would never fire.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  async function refresh() {
    const apps = await api.listApps();
    const found = apps.find((a) => a.id === appId) ?? null;
    setApp(found);
    return found;
  }

  useEffect(() => {
    refresh().then((found) => {
      if (found && found.subspaces.length > 0) {
        setActiveSubspaceId(found.subspaces[0].id);
      }
    });
    api.getSidebarExpanded(appId).then(setExpanded);
  }, [appId]);

  useEffect(() => {
    const unlisten = listen("app-data-changed", () => {
      setIconCache({});
      refresh();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [appId]);

  useEffect(() => {
    if (!app) return;
    app.subspaces.forEach((s) => {
      const source = s.icon ?? app.icon;
      if (source && !iconCache[s.id]) {
        api.readIconDataUrl(source).then((dataUrl) => {
          setIconCache((prev) => ({ ...prev, [s.id]: dataUrl }));
        });
      }
    });
  }, [app]);

  async function handleSelect(subspaceId: string) {
    setActiveSubspaceId(subspaceId);
    await api.selectSubspace(appId, subspaceId);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    if (!app || !over || active.id === over.id) return;
    const oldIndex = app.subspaces.findIndex((s) => s.id === active.id);
    const newIndex = app.subspaces.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const subspaces = arrayMove(app.subspaces, oldIndex, newIndex);
    setApp({ ...app, subspaces });
    await api.reorderSubspaces(
      appId,
      subspaces.map((s) => s.id),
    );
  }

  async function handleToggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    await api.toggleSidebar(appId, next);
  }

  if (!app) return null;

  const draggingSubspace = draggingId ? app.subspaces.find((s) => s.id === draggingId) : undefined;

  return (
    <aside className={`sidebar-rail ${expanded ? "sidebar-rail-expanded" : ""}`}>
      {/* dnd-kit, not a hand-rolled pointer/elementFromPoint implementation:
          an earlier hand-rolled version had real reliability bugs (targets
          oscillating back and forth, drops not registering) that dnd-kit's
          own hit-testing/activation handling avoids. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <SortableContext items={app.subspaces.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="rail-list">
            {app.subspaces.map((s) => (
              <RailIcon
                key={s.id}
                subspace={s}
                iconStyle={app.icon_style}
                iconUrl={iconCache[s.id]}
                appBackground={app.icon_background_color}
                active={s.id === activeSubspaceId}
                expanded={expanded}
                appUrl={s.start_url ?? app.url}
                onClick={() => handleSelect(s.id)}
                onContextMenu={() => api.showSubspaceMenu(appId, s.id)}
              />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay>
          {draggingSubspace && (
            <div className="drag-ghost">
              <RailIconSwatch
                subspace={draggingSubspace}
                iconStyle={app.icon_style}
                iconUrl={iconCache[draggingSubspace.id]}
                appBackground={app.icon_background_color}
              />
              {expanded && (
                <span className="rail-row-info">
                  <span className="rail-row-name">{draggingSubspace.name}</span>
                  <span className="rail-row-url">{draggingSubspace.start_url ?? app.url}</span>
                </span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="rail-bottom">
        <button className="rail-bottom-btn" onClick={() => api.openAddSubspacePopup(appId)} title={t("appSidebar.addSubspaceTitle")}>
          <span className="rail-icon rail-icon-ghost">+</span>
          {expanded && <span className="rail-row-name">{t("appSidebar.addSubspaceLabel")}</span>}
        </button>
        <button
          className="rail-bottom-btn"
          onClick={handleToggleExpanded}
          title={expanded ? t("appSidebar.collapseSidebarTitle") : t("appSidebar.expandSidebarTitle")}
        >
          <span className="rail-icon rail-icon-ghost">{expanded ? "‹" : "›"}</span>
          {expanded && <span className="rail-row-name">{t("appSidebar.collapseSidebarLabel")}</span>}
        </button>
        <button className="rail-bottom-btn" onClick={() => api.openDashboard()} title={t("appSidebar.openDashboardTitle")}>
          <span className="rail-icon rail-icon-ghost">
            <HomeIcon />
          </span>
          {expanded && <span className="rail-row-name">{t("appSidebar.openDashboardLabel")}</span>}
        </button>
        <button className="rail-bottom-btn" onClick={() => api.openAppSettings(appId)} title={t("appSidebar.appSettingsTitle")}>
          <span className="rail-icon rail-icon-ghost">
            <GearIcon />
          </span>
          {expanded && <span className="rail-row-name">{t("appSidebar.appSettingsLabel")}</span>}
        </button>
        <button
          className="rail-bottom-btn"
          onClick={() => api.openQuitConfirmPopup(appId)}
          title={t("appSidebar.quitTitle")}
        >
          <span className="rail-icon rail-icon-ghost rail-icon-danger">
            <PowerIcon />
          </span>
          {expanded && <span className="rail-row-name rail-row-name-danger">{t("appSidebar.quitLabel")}</span>}
        </button>
      </div>
    </aside>
  );
}

// Extracted so the DragOverlay ghost above renders the exact same icon
// markup as the real row below, instead of a visually-approximate copy.
function RailIconSwatch({
  subspace,
  iconStyle,
  iconUrl,
  appBackground,
}: {
  subspace: Subspace;
  iconStyle: IconStyle;
  iconUrl?: string;
  appBackground: string | null;
}) {
  return (
    <span
      className={["rail-icon", iconStyle.rounded ? "" : "rail-icon-square"].filter(Boolean).join(" ")}
      style={
        {
          "--ring-color": sessionColor(subspace.session_group),
          background: subspace.icon_background_color ?? appBackground ?? "transparent",
        } as CSSProperties
      }
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={subspace.name}
          style={{ objectFit: iconStyle.fit, padding: `${iconStyle.padding_percent}%` }}
        />
      ) : (
        <span className="rail-icon-fallback">{subspace.name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

function RailIcon({
  subspace,
  iconStyle,
  iconUrl,
  appBackground,
  active,
  expanded,
  appUrl,
  onClick,
  onContextMenu,
}: {
  subspace: Subspace;
  iconStyle: IconStyle;
  iconUrl?: string;
  appBackground: string | null;
  active: boolean;
  expanded: boolean;
  appUrl: string;
  onClick: () => void;
  onContextMenu: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subspace.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <button
        className={`rail-row ${active ? "rail-row-active" : ""} ${isDragging ? "rail-row-dragging" : ""}`}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu();
        }}
        title={subspace.name}
        {...attributes}
        {...listeners}
      >
        <RailIconSwatch subspace={subspace} iconStyle={iconStyle} iconUrl={iconUrl} appBackground={appBackground} />
        {expanded && (
          <span className="rail-row-info">
            <span className="rail-row-name">{subspace.name}</span>
            <span className="rail-row-url">{appUrl}</span>
          </span>
        )}
      </button>
    </li>
  );
}
