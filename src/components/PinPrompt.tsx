import { useState } from "react";

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
      setError("PIN errato.");
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
          placeholder="PIN"
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="btn-row">
          <button onClick={submit} disabled={checking || !pin}>
            Sblocca
          </button>
          <button className="ghost" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
