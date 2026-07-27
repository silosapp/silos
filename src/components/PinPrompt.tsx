import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PinPrompt({
  title,
  message,
  onSubmit,
  onCancel,
}: {
  title: string;
  message: string;
  onSubmit: (pin: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit() {
    setChecking(true);
    setError(null);
    try {
      await onSubmit(pin);
      setPin("");
    } catch {
      setError(t("pinPrompt.wrongPinError"));
      setPin("");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <input
          type="password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !checking && submit()}
          placeholder={t("pinPrompt.placeholder")}
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="btn-row">
          <button onClick={submit} disabled={checking || !pin}>
            {t("pinPrompt.unlockButton")}
          </button>
          <button className="ghost" onClick={onCancel}>
            {t("pinPrompt.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
