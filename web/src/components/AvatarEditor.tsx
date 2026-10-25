import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, Move, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { body, display } from "../lib/fonts";
import {
  DEFAULT_CROP,
  MAX_AVATAR_BYTES,
  MAX_AVATAR_ZOOM,
  clampCrop,
  renderAvatar,
  type AvatarCrop,
} from "../lib/avatar";

// Crop dialog for the profile picture: drag to move, slider, wheel or +/- to
// zoom, arrow keys to nudge. What is inside the circle becomes the avatar.

export interface AvatarSource {
  url: string;
  /** Present when the picture is a new upload (it becomes the kept original). */
  file?: File;
  crop?: AvatarCrop;
}

const STAGE = 288; // px, circle diameter on screen
const EASE = [0.22, 1, 0.36, 1] as const;

export default function AvatarEditor({
  source,
  onClose,
  onPickFile,
  onSave,
}: {
  source: AvatarSource | null;
  onClose: () => void;
  onPickFile: () => void;
  onSave: (cropped: Blob, crop: AvatarCrop, original?: File) => Promise<string | null>;
}) {
  return (
    <AnimatePresence>
      {source && <Dialog key={source.url} source={source} onClose={onClose} onPickFile={onPickFile} onSave={onSave} />}
    </AnimatePresence>
  );
}

function Dialog({
  source,
  onClose,
  onPickFile,
  onSave,
}: {
  source: AvatarSource;
  onClose: () => void;
  onPickFile: () => void;
  onSave: (cropped: Blob, crop: AvatarCrop, original?: File) => Promise<string | null>;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(source.crop ?? DEFAULT_CROP);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; start: AvatarCrop } | null>(null);

  const update = useCallback(
    (next: AvatarCrop) => setCrop(natural ? clampCrop(next, natural.w, natural.h) : next),
    [natural],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind still while the dialog is open (wheel zooms here).
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, saving]);

  const tooBig = !!source.file && source.file.size > MAX_AVATAR_BYTES;

  // Size of the image on screen at the current zoom.
  const cover = natural ? STAGE / Math.min(natural.w, natural.h) : 1;
  const w = natural ? natural.w * cover * crop.zoom : STAGE;
  const h = natural ? natural.h * cover * crop.zoom : STAGE;

  const save = async () => {
    if (!imgRef.current || !natural) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await renderAvatar(imgRef.current, crop);
      const problem = await onSave(blob, crop, source.file);
      if (problem) setError(problem);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the photo.");
    }
    setSaving(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#08313A]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-editor-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="w-full max-w-[440px] rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
        style={body}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="avatar-editor-title" className="text-xl font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
              Adjust photo
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Drag to position, zoom to resize. The circle is what others see.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-[#F3F7F6] hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stage: the square shows the whole frame dimmed, the circle in full. */}
        <div
          className="relative mx-auto mt-5 cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-[#0B2A22] outline-none active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-[#45DFB1]/40"
          style={{ width: "100%", maxWidth: STAGE + 48, aspectRatio: "1" }}
          tabIndex={0}
          aria-label="Photo position. Use arrow keys to move, plus and minus to zoom."
          onPointerDown={(e) => {
            if (!natural) return;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // capture is a nicety; dragging works without it
            }
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: crop };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            update({ ...d.start, x: d.start.x + (e.clientX - d.x) / STAGE, y: d.start.y + (e.clientY - d.y) / STAGE });
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => update({ ...crop, zoom: crop.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06) })}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 0.05 : 0.01;
            const map: Record<string, Partial<AvatarCrop>> = {
              ArrowLeft: { x: crop.x - step },
              ArrowRight: { x: crop.x + step },
              ArrowUp: { y: crop.y - step },
              ArrowDown: { y: crop.y + step },
              "+": { zoom: crop.zoom + 0.1 },
              "=": { zoom: crop.zoom + 0.1 },
              "-": { zoom: crop.zoom - 0.1 },
            };
            const change = map[e.key];
            if (change) {
              e.preventDefault();
              update({ ...crop, ...change });
            }
          }}
        >
          {!failed && (
            <img
              ref={imgRef}
              src={source.url}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNatural({ w: el.naturalWidth, h: el.naturalHeight });
                setCrop((c) => clampCrop(c, el.naturalWidth, el.naturalHeight));
              }}
              onError={() => setFailed(true)}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: w,
                height: h,
                transform: `translate(calc(-50% + ${crop.x * STAGE}px), calc(-50% + ${crop.y * STAGE}px))`,
                opacity: natural ? 1 : 0,
              }}
            />
          )}
          {/* Dim outside the circle, thin ring and thirds inside it. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_9999px_rgba(8,49,58,0.62)] ring-2 ring-white/90"
            style={{ width: STAGE, height: STAGE, maxWidth: "calc(100% - 24px)", maxHeight: "calc(100% - 24px)" }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
            </div>
          </div>
          {!natural && !failed && (
            <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/70" />
          )}
          {failed && (
            <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/80">
              This picture could not be opened for editing. Choose the photo again.
            </p>
          )}
          {natural && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/90">
              <Move className="h-3 w-3" /> Drag to move
            </span>
          )}
        </div>

        {/* Zoom */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => update({ ...crop, zoom: crop.zoom - 0.2 })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#0B6477] transition-colors hover:bg-[#F3F7F6]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_AVATAR_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => update({ ...crop, zoom: Number(e.target.value) })}
            aria-label="Zoom"
            className="h-1.5 w-full cursor-pointer accent-[#14919B]"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => update({ ...crop, zoom: crop.zoom + 0.2 })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#0B6477] transition-colors hover:bg-[#F3F7F6]"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-neutral-500">{Math.round(crop.zoom * 100)}%</span>
        </div>

        {(error || tooBig) && (
          <p className="mt-3 text-sm text-[#B91C1C]" role="alert">
            {tooBig ? "This file is larger than 10 MB. Choose a smaller photo." : error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#0B6477]/8 pt-4">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onPickFile}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[#0B6477] transition-colors hover:bg-[#F3F7F6]"
            >
              <ImagePlus className="h-4 w-4" /> Another photo
            </button>
            <button
              type="button"
              onClick={() => update(DEFAULT_CROP)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-[#F3F7F6]"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-[#F3F7F6]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !natural || failed || tooBig}
              className="inline-flex items-center gap-2 rounded-xl bg-[#45DFB1] px-4 py-2.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save photo
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
