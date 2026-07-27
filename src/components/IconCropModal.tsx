import { useCallback, useState } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { api } from "../api";

interface Props {
  sourcePath: string;
  sourceUrl: string;
  onCancel: () => void;
  onCropped: (newPath: string) => void;
}

/// Square crop/zoom editor for a picked icon source (any of the four
/// IconPicker sources funnel here). Confirming sends the crop rect — already
/// in the source image's own pixel space, react-easy-crop reports it that
/// way — to the `crop_icon` backend command, which produces a fresh cached
/// file, same contract as every other icon source.
export function IconCropModal({ sourcePath, sourceUrl, onCancel, onCropped }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setArea(croppedAreaPixels);
  }, []);

  async function apply() {
    if (!area || busy) return;
    setBusy(true);
    setError(null);
    try {
      const newPath = await api.cropIcon(
        sourcePath,
        Math.round(area.x),
        Math.round(area.y),
        Math.round(area.width),
        Math.round(area.height),
      );
      onCropped(newPath);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box icon-crop-box">
        <h2>Ritaglia icona</h2>
        <div className="icon-crop-stage">
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <label className="settings-field">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        {error && <div className="site-confirm-error">{error}</div>}
        <div className="btn-row">
          <button type="button" className="ghost" disabled={busy} onClick={onCancel}>
            Annulla
          </button>
          <button type="button" disabled={busy || !area} onClick={apply}>
            {busy ? "Applico..." : "Applica ritaglio"}
          </button>
        </div>
      </div>
    </div>
  );
}
