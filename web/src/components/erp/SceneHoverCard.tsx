import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { chamberObjectFacts, factoryObjectFacts, holeFacts, slotFacts, type SceneFacts } from "../../lib/pf/scene-facts";
import type { ErpStore } from "../../lib/pf/store";
import type { ChamberEngine } from "./SeedChamberScene";
import type { SceneEngine } from "./PlantFactoryScene";
import { Bar } from "./ui";

// The card that floats beside the cursor in a 3D model and says what the plant, the tray
// or the equipment under it is doing. The engine reports what is hovered, and its own
// plain label is turned off where the scenes are mounted. The card moves by style rather
// than state, so following the cursor does not re-render the page around the model.

export type SceneTarget = { kind: string; id: string };
type AnyEngine = SceneEngine | ChamberEngine;

const MARGIN = 8;
const OFFSET = 16;
/** A press that moves further than this is a turn of the model, not a click. */
const DRAG_PX = 5;

/** Puts a zoom on the wheel that goes where the cursor is, in any of the three models. */
export function zoomToCursor(engine: AnyEngine) {
  (engine.three.controls as { zoomToCursor: boolean }).zoomToCursor = true;
}

export function sceneFacts(store: ErpStore, engine: AnyEngine | null, target: SceneTarget | null): SceneFacts | null {
  if (!engine || !target) return null;
  if (target.kind === "hole") return holeFacts(store, target.id);
  if (target.kind === "slot") return slotFacts(store, target.id);
  const objects = engine.manifest.objects as { id: string; type: string }[];
  const object = objects.find((o) => o.id === target.id);
  if (!object) return null;
  return "bounds" in engine.manifest && "controlX" in engine.manifest.bounds ? factoryObjectFacts(store, object) : chamberObjectFacts(store, object);
}

/** The thing under the cursor, and a way to place a card by the cursor without re-rendering. */
export function useSceneHover(engine: AnyEngine | null, box: RefObject<HTMLElement | null>, frozen = false) {
  const [target, setTarget] = useState<SceneTarget | null>(null);
  const hold = useRef(frozen);
  hold.current = frozen;
  const cursor = useRef({ x: 0, y: 0 });
  const card = useRef<HTMLDivElement | null>(null);

  const place = useCallback(() => {
    const el = card.current;
    const frame = box.current;
    if (!el || !frame) return;
    const { x, y } = cursor.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = x + OFFSET + w > frame.clientWidth - MARGIN ? x - OFFSET - w : x + OFFSET;
    const top = Math.min(y + OFFSET, frame.clientHeight - h - MARGIN);
    el.style.transform = `translate(${Math.max(left, MARGIN)}px, ${Math.max(top, MARGIN)}px)`;
  }, [box]);

  useEffect(() => {
    if (!engine) return;
    const canvas = engine.three.renderer.domElement;
    let pressed = false;
    const off = (engine as SceneEngine).on("hover", (s) => {
      if (pressed) return;
      setTarget((now) => (now?.id === s?.id ? now : s));
    });
    const follow = (e: PointerEvent) => {
      const r = box.current?.getBoundingClientRect();
      if (r) cursor.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (hold.current) return;
      follow(e);
      place();
    };
    const onDown = (e: PointerEvent) => {
      pressed = true;
      follow(e);
      setTarget(null);
    };
    const onUp = () => {
      pressed = false;
    };
    const clear = () => setTarget(null);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", clear);
    canvas.addEventListener("wheel", clear, { passive: true });
    return () => {
      off();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", clear);
      canvas.removeEventListener("wheel", clear);
      setTarget(null);
    };
  }, [engine, box, place]);

  return { target, cursor, card, place };
}

/**
 * A click on the model keeps the card in place, for a touch screen and for reaching its
 * link. It lets go on a click elsewhere, on Escape, or once the model is turned or zoomed.
 */
export function useScenePin(engine: AnyEngine | null) {
  const [pinned, setPinned] = useState<SceneTarget | null>(null);

  const pin = useCallback((s: SceneTarget | null) => setPinned(s), []);

  useEffect(() => {
    if (!engine || !pinned) return;
    const canvas = engine.three.renderer.domElement;
    let from: [number, number] | null = null;
    const onDown = (e: PointerEvent) => {
      from = [e.clientX, e.clientY];
    };
    const onMove = (e: PointerEvent) => {
      if (from && Math.hypot(e.clientX - from[0], e.clientY - from[1]) > DRAG_PX) release();
    };
    const release = () => {
      from = null;
      setPinned(null);
      (engine as SceneEngine).select(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") release();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("wheel", release, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("wheel", release);
      window.removeEventListener("keydown", onKey);
    };
  }, [engine, pinned]);

  return { pinned, pin };
}

export default function SceneHoverCard({ facts, cardRef, place, onClose, children }: { facts: SceneFacts; cardRef: RefObject<HTMLDivElement | null>; place: () => void; onClose?: () => void; children?: ReactNode }) {
  // The size changes with what the card says, so its place is worked out after each change.
  useLayoutEffect(place);
  return (
    <div
      ref={cardRef}
      role="status"
      className={`absolute left-0 top-0 z-20 w-[256px] rounded-xl border border-[#DCE7E8] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(8,49,58,0.14)] ${onClose ? "" : "pointer-events-none"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-[#0F2F36]">{facts.title}</p>
          <p className="truncate text-[12.5px] text-[#4F6B73]">{facts.sub}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close card" className="-mr-1 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#EEF5F5]">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {facts.state && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#0F2F36]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: facts.state.color }} />
          {facts.state.label}
        </p>
      )}
      {facts.progress && (
        <div className="mt-2">
          <Bar value={facts.progress.value} max={facts.progress.max || 1} color={facts.state?.color} />
          <p className="mt-1 text-[12.5px] tabular-nums text-[#4F6B73]">{facts.progress.label}</p>
        </div>
      )}
      {facts.rows.length > 0 && (
        <dl className="mt-2 space-y-0.5 border-t border-[#EDF2F2] pt-2 text-[12.5px]">
          {facts.rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="whitespace-nowrap text-[#4F6B73]">{k}</dt>
              <dd className="truncate text-right font-medium tabular-nums text-[#0F2F36]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {facts.note && <p className="mt-2 text-[12.5px] leading-[1.4] text-[#4F6B73]">{facts.note}</p>}
      {children}
    </div>
  );
}
