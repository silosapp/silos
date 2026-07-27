import { useState } from "react";

interface Props {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmTyped({ label, onConfirm, onCancel, busy }: Props) {
  const [value, setValue] = useState("");

  return (
    <div className="confirm-typed">
      <p className="confirm-typed-hint">
        Scrivi <strong>OK</strong> per confermare.
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
          Annulla
        </button>
      </div>
    </div>
  );
}
