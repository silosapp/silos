import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WebApp } from "../types";
import { api } from "../api";
import { PinPrompt } from "./PinPrompt";

interface Props {
  appId: string;
}

export function UnlockAppScreen({ appId }: Props) {
  const { t } = useTranslation();
  const [app, setApp] = useState<WebApp | null>(null);

  useEffect(() => {
    api.listApps().then((apps) => setApp(apps.find((a) => a.id === appId) ?? null));
  }, [appId]);

  if (!app) return null;

  return (
    <PinPrompt
      title={app.name}
      message={t("pinPrompt.message")}
      onSubmit={(pin) => api.unlockAppWindow(appId, pin)}
      onCancel={() => api.cancelAppUnlock(appId)}
    />
  );
}
