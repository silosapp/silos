import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmTyped({ label, onConfirm, onCancel, busy }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  return (
    <div className="confirm-typed">
      <p className="confirm-typed-hint">
        {t("confirmTyped.hintPrefix")} <strong>OK</strong> {t("confirmTyped.hintSuffix")}
      </p>
      <div className="btn-row">
        <input
          className="confirm-typed-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="OK"
          autoFocus
          disabled={busy}
        />
        <button className="danger-ghost" onClick={onConfirm} disabled={busy || value.trim() !== "OK"}>
          {label}
        </button>
        <button className="ghost" onClick={onCancel} disabled={busy}>
          {t("confirmTyped.cancel")}
        </button>
      </div>
    </div>
  );
}
