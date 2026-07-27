import { useEffect, useRef } from "react";

const PREVIEW_SIZES = [16, 24, 32, 48, 64, 128, 256];

/// Matches apply_rounded_mask's RADIUS_RATIO in commands.rs, so the preview
/// tracks what the native icon will actually look like.
const RADIUS_RATIO = 0.22;

interface Props {
  iconUrl: string;
  rounded: boolean;
  fit: "cover" | "contain";
  background?: string | null;
  paddingPercent?: number;
}

/// Client-side canvas render of the current icon at every real size it ships
/// at (window/taskbar/tray/shortcut .ico entries), mirroring the Rust
/// pad_and_resize/composite_on_background/apply_rounded_mask pipeline closely
/// enough for a live preview — no IPC round-trip needed while a slider moves.
export function IconSizePreview({ iconUrl, rounded, fit, background, paddingPercent = 0 }: Props) {
  return (
    <div className="icon-size-preview-grid">
      {PREVIEW_SIZES.map((size) => (
        <IconSizeSwatch
          key={size}
          size={size}
          iconUrl={iconUrl}
          rounded={rounded}
          fit={fit}
          background={background}
          paddingPercent={paddingPercent}
        />
      ))}
    </div>
  );
}

function IconSizeSwatch({ size, iconUrl, rounded, fit, background, paddingPercent = 0 }: Props & { size: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const displaySize = Math.min(size, 64);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, displaySize, displaySize);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, displaySize, displaySize);
      ctx.save();

      if (rounded) {
        const radius = displaySize * RADIUS_RATIO;
        ctx.beginPath();
        ctx.roundRect(0, 0, displaySize, displaySize, radius);
        ctx.clip();
      }

      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, displaySize, displaySize);
      }

      const padding = Math.min(paddingPercent, 40) / 100;
      const inner = displaySize * (1 - 2 * padding);
      const offset = (displaySize - inner) / 2;

      const srcRatio = img.width / img.height;
      let drawW = inner;
      let drawH = inner;
      let dx = offset;
      let dy = offset;

      if (fit === "cover") {
        if (srcRatio > 1) drawW = inner * srcRatio;
        else drawH = inner / srcRatio;
        dx = offset - (drawW - inner) / 2;
        dy = offset - (drawH - inner) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(offset, offset, inner, inner);
        ctx.clip();
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
      } else {
        if (srcRatio > 1) drawH = inner / srcRatio;
        else drawW = inner * srcRatio;
        dx = offset + (inner - drawW) / 2;
        dy = offset + (inner - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
      }

      ctx.restore();
    };
    img.src = iconUrl;
  }, [iconUrl, rounded, fit, background, paddingPercent, displaySize]);

  return (
    <div className="icon-size-swatch">
      <canvas
        ref={canvasRef}
        style={{
          width: displaySize,
          height: displaySize,
          // Same radius the canvas draw clips to (RADIUS_RATIO below), so the
          // checkerboard behind it never peeks past a mismatched CSS corner.
          borderRadius: rounded ? `${displaySize * RADIUS_RATIO}px` : 0,
        }}
      />
      <span className="icon-size-swatch-label mono">{size}px</span>
    </div>
  );
}
