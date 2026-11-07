import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ChevronLeft, Eye, DoorOpen, Layers, Lightbulb, LightbulbOff, Maximize2, Minus, Plus, RotateCcw, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { ChamberOptionsState, ChamberViewName, SceneOptionsState, ViewName } from "plant-factory-3d";
import { SHELVES } from "../../lib/pf/chamber";
import { rowState, rowValue, STATE_WORD, type Conditions } from "../../lib/pf/conditions";
import { HOLES_TOTAL, isPlanted } from "../../lib/pf/facility";
import { RACK_NUMBERS, TIER_NUMBERS } from "../../lib/pf/provider";
import type { ErpStore } from "../../lib/pf/store";
import type { ChamberEngine } from "./SeedChamberScene";
import type { SceneEngine } from "./PlantFactoryScene";
import SceneHoverCard, { sceneFacts, useSceneHover, useScenePin, zoomToCursor } from "./SceneHoverCard";
import { SceneStatus, dolly, useEngineActivity } from "./ui";

// The live 3D model on the front page, one facility at a time. Dragging turns it, the
// wheel zooms towards the cursor, pointing at a plant or a tray floats a card with its
// status, and clicking keeps that card open with a link to the spot on its full screen.
// Key numbers float over its top left; a strip of small icons on its right
// changes how the model looks, each opening a panel with the words. Everything in that
// strip is a view of the model: the ERP only monitors, nothing here reaches a device.

const PlantFactoryScene = lazy(() => import("./PlantFactoryScene"));
const SeedChamberScene = lazy(() => import("./SeedChamberScene"));

export type Facility = "plant-factory" | "persemaian";
type AnyEngine = SceneEngine | ChamberEngine;

const FACILITIES: { key: Facility; label: string }[] = [
  { key: "plant-factory", label: "Plant factory" },
  { key: "persemaian", label: "Seedlings" },
];

const PF_VIEWS: { key: ViewName; label: string }[] = [
  { key: "iso", label: "Isometric" },
  { key: "top", label: "From above" },
  { key: "grow", label: "Grow room" },
  { key: "control", label: "Control room" },
];

const CHAMBER_VIEWS: { key: ChamberViewName; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "inside", label: "Inside" },
];

const KEY_CARD_WIDTH = 136;
const STRIP_ROOM = 72;
/** The narrowest card the engine's outside view fits without moving back; the same number as in its setView. */
const FRAMED_ASPECT = 1.35;

export function useLargeScreen() {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setLarge(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return large;
}

/* ---------------------------------------------------------- the icon strip */

const stripButton = "group/tool relative grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:opacity-40";

function StripButton({ icon: Icon, label, active, pressed, disabled, onClick }: { icon: LucideIcon; label: string; active?: boolean; pressed?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} aria-expanded={active} aria-pressed={pressed} disabled={disabled} onClick={onClick} className={`${stripButton} ${active || pressed ? "bg-[#DDE8E8] text-[#0B6477]" : "text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]"}`}>
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      {!active && <span className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0F2F36] px-2 py-1 text-[12px] font-medium text-white opacity-0 transition-opacity group-hover/tool:opacity-100 group-focus-visible/tool:opacity-100">{label}</span>}
    </button>
  );
}

function Flyout({ title, note, top, onClose, children }: { title: string; note?: string; top: number; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute right-[calc(100%+8px)] z-10 w-[216px] rounded-xl border border-[#DCE7E8] bg-white p-1.5 shadow-[0_8px_24px_rgba(8,49,58,0.14)]" style={{ top }}>
      <div className="flex items-center gap-1 px-1.5 pb-1 pt-0.5">
        <button type="button" onClick={onClose} aria-label="Close panel" className="-ml-1 grid h-6 w-6 place-items-center rounded text-[#4F6B73] hover:bg-[#EEF5F5]"><ChevronLeft className="h-3.5 w-3.5 rotate-180" /></button>
        <p className="text-[13px] font-medium text-[#0F2F36]">{title}</p>
      </div>
      {children}
      {note && <p className="px-2 pb-1 pt-1.5 text-[12px] leading-[1.4] text-[#4F6B73]">{note}</p>}
    </div>
  );
}

function Choice({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={`flex min-h-[32px] w-full items-center justify-between rounded-lg px-2 text-left text-[13.5px] ${on ? "bg-[#EEF5F5] font-medium text-[#0F2F36]" : "text-[#36525A] hover:bg-[#F3F7F7]"}`}>
      {children}
      {on && <span className="h-1.5 w-1.5 rounded-full bg-[#14919B]" />}
    </button>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex min-h-[32px] w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-[13.5px] text-[#36525A] hover:bg-[#F3F7F7]">
      {label}
      <span className={`relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors motion-reduce:transition-none ${on ? "bg-[#14919B]" : "bg-[#C9D6D8]"}`}>
        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-[left] motion-reduce:transition-none ${on ? "left-[14px]" : "left-[2px]"}`} />
      </span>
    </button>
  );
}

const MODEL_ONLY = "This only changes how the model looks, not the real equipment.";

/* ------------------------------------------------------------- the key cards */

function KeyCard({ label, value, unit, sub, warn }: { label: string; value: string; unit: string; sub: string; warn?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-2" style={{ width: KEY_CARD_WIDTH }}>
      <p className="truncate text-[12.5px] text-[#4F6B73]">{label}</p>
      <p className="truncate text-[#0F2F36]"><span className="text-[20px] font-semibold leading-tight tabular-nums tracking-[-0.02em]">{value}</span>{unit && <span className="ml-1 text-[12.5px] text-[#4F6B73]">{unit}</span>}</p>
      <p className={`truncate text-[12px] ${warn ? "font-medium text-[#8A5A07]" : "text-[#4F6B73]"}`}>{sub}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ the card */

type Panel = "facility" | "view" | "light" | "door" | "layers" | "filter";

export default function FacilityViewer({ store, facility, onFacility, conditions }: { store: ErpStore; facility: Facility; onFacility: (f: Facility) => void; conditions: Conditions }) {
  const [engine, setEngine] = useState<AnyEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [view, setView] = useState<string>("iso");
  const [options, setOptions] = useState<Partial<SceneOptionsState & ChamberOptionsState>>({});
  const [filter, setFilter] = useState<{ rack?: number; tier?: number; shelf?: number }>({});
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const { pinned, pin } = useScenePin(engine);
  const { target: hovered, card, place } = useSceneHover(engine, stage, !!pinned);

  useEngineActivity(engine, visible);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const seen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    seen.observe(el);
    const sized = new ResizeObserver(() => setWidth(el.clientWidth));
    sized.observe(el);
    return () => {
      seen.disconnect();
      sized.disconnect();
    };
  }, []);

  useEffect(() => {
    engine?.refresh();
  }, [engine, store.dataVersion]);

  // The engine frames the model for the card's shape only when a view is set. Dragging
  // the divide changes the shape afterwards, so the camera backs away by the same rule,
  // keeping whatever angle the model was turned to.
  const backedOff = useRef(1);
  const fitFactor = useCallback(() => {
    const el = stage.current;
    return el?.clientHeight ? Math.max(1, FRAMED_ASPECT / (el.clientWidth / el.clientHeight)) : 1;
  }, []);
  useEffect(() => {
    backedOff.current = fitFactor();
  }, [engine, fitFactor]);
  useEffect(() => {
    if (!engine) return;
    const wanted = fitFactor();
    dolly(engine, wanted / backedOff.current);
    backedOff.current = wanted;
  }, [engine, width, fitFactor]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    const onPress = (e: PointerEvent) => {
      if (!strip.current?.contains(e.target as Node)) setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPress);
    };
  }, [panel]);

  const prior = useRef(facility);
  if (prior.current !== facility) {
    prior.current = facility;
    setEngine(null);
    setFailed(false);
    setPanel(null);
    setFilter({});
    pin(null);
  }

  const onReady = useCallback((e: AnyEngine) => {
    setEngine(e);
    zoomToCursor(e);
    // The covers would stop the pointer reaching the plants below them.
    if ("showCovers" in e.options) (e as SceneEngine).setOptions({ showCovers: false });
    setView(e.view);
    setOptions({ ...e.options });
    (e as SceneEngine).on("options", (o) => setOptions({ ...o }));
    (e as SceneEngine).on("view", (v) => {
      setView(v);
      backedOff.current = fitFactor();
    });
  }, [fitFactor]);
  const onError = useCallback((e: unknown) => {
    console.error("The 3D model could not be loaded", e);
    setFailed(true);
  }, []);

  const isFactory = facility === "plant-factory";
  const pf = isFactory ? (engine as SceneEngine | null) : null;
  const ch = isFactory ? null : (engine as ChamberEngine | null);
  const setOption = (o: Partial<SceneOptionsState & ChamberOptionsState>) => {
    (engine as SceneEngine | null)?.setOptions(o);
    setOptions((now) => ({ ...now, ...o }));
  };
  const applyFilter = (f: typeof filter) => {
    setFilter((now) => ({ ...now, ...f }));
    if (isFactory) pf?.setFilter(f);
    else ch?.setFilter(f);
  };
  const togglePanel = (p: Panel) => setPanel((now) => (now === p ? null : p));

  const holes = [...store.pf.holes.values()];
  const slots = [...store.chamber.slots.values()];
  const filled = isFactory ? holes.filter((h) => isPlanted(h.state)).length : slots.filter((s) => s.state !== "kosong").length;
  const capacity = isFactory ? HOLES_TOTAL : slots.length;

  const room = Math.floor((width - STRIP_ROOM - 16) / KEY_CARD_WIDTH);
  const shownCards = width < 300 ? 0 : Math.min(room, 4);
  const air = conditions.rows.filter((r) => ["suhu", "rh", "co2"].includes(r.metric)).slice(0, 3);
  const cards = [
    ...air.map((r) => {
      const state = rowState(r);
      return { key: r.metric, label: r.label, value: rowValue(r), unit: r.unit.replace(" RH", ""), sub: conditions.sample ? "Sample" : state ? STATE_WORD[state] : "No reference", warn: state === "rendah" || state === "tinggi" };
    }),
    { key: "isi", label: isFactory ? "Holes filled" : "Trays filled", value: store.hasData ? `${filled}` : "-", unit: `/${capacity}`, sub: isFactory ? "Plant factory" : "Seedlings", warn: false },
  ].slice(0, shownCards);

  // While a card is kept open, it stands in for the one that follows the cursor.
  const shownFacts = sceneFacts(store, engine, pinned ?? hovered);

  // Each flyout lines up with its icon: 32px icons on a 32px pitch, inside 4px of padding.
  const topOf = (i: number) => i * 32;
  const doorLabel = isFactory ? "Building" : "Door";

  return (
    <section ref={stage} className="relative h-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-[#DCE7E8] bg-[#E7EAE7]" aria-label={`3D model ${isFactory ? "plant factory" : "persemaian"}`}>
      <Suspense fallback={<SceneStatus failed={false} />}>
        {isFactory ? (
          <PlantFactoryScene
            key="pf"
            provider={store.pf}
            onReady={onReady}
            onError={onError}
            onSelect={pin}
          />
        ) : (
          <SeedChamberScene
            key="ch"
            provider={store.chamber}
            onReady={onReady}
            onError={onError}
            onSelect={pin}
          />
        )}
      </Suspense>
      {!engine && <SceneStatus failed={failed} />}

      {cards.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 flex divide-x divide-[#EDF2F2] rounded-xl border border-[#DCE7E8] bg-white">
          {cards.map((c) => <KeyCard key={c.key} label={c.label} value={c.value} unit={c.unit} sub={c.sub} warn={c.warn} />)}
        </div>
      )}

      {width >= 360 && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[#DCE7E8] bg-white px-2 py-1 text-[12.5px] text-[#4F6B73]">
          <span className="font-medium text-[#0F2F36]">{isFactory ? "Plant factory · PF01" : "Seedlings · CH1"}</span> · drag to turn, scroll to zoom
        </p>
      )}

      {shownFacts && (
        <SceneHoverCard facts={shownFacts} cardRef={card} place={place} onClose={pinned ? () => { pin(null); (engine as SceneEngine | null)?.select(null); } : undefined}>
          {pinned && pinned.kind === "hole" && (
            <Link to="/erp/plant-factory" search={{ hole: pinned.id }} className="mt-2 inline-flex min-h-[28px] items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">Open and edit <ArrowRight className="h-3.5 w-3.5" /></Link>
          )}
          {pinned && pinned.kind === "slot" && (
            <Link to="/erp/seedlings" search={{ slot: pinned.id }} className="mt-2 inline-flex min-h-[28px] items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">Open and edit <ArrowRight className="h-3.5 w-3.5" /></Link>
          )}
        </SceneHoverCard>
      )}

      <div ref={strip} className="absolute right-3 top-3">
        <div className="relative flex flex-col rounded-xl border border-[#DCE7E8] bg-white p-1">
          <StripButton icon={Building2} label="Facility" active={panel === "facility"} onClick={() => togglePanel("facility")} />
          <StripButton icon={Eye} label="Viewpoint" active={panel === "view"} disabled={!engine} onClick={() => togglePanel("view")} />
          <StripButton icon={options.realLight ? Lightbulb : LightbulbOff} label="Lamp" active={panel === "light"} pressed={!!options.realLight} disabled={!engine} onClick={() => togglePanel("light")} />
          <StripButton icon={isFactory ? Layers : DoorOpen} label={doorLabel} active={panel === "door"} disabled={!engine} onClick={() => togglePanel("door")} />
          <StripButton icon={SlidersHorizontal} label="Filter by rack" active={panel === "filter"} pressed={!!(filter.rack || filter.tier || filter.shelf)} disabled={!engine} onClick={() => togglePanel("filter")} />
          <div className="mx-1.5 my-1 h-px bg-[#EDF2F2]" />
          <StripButton icon={Plus} label="Zoom in" disabled={!engine} onClick={() => engine && dolly(engine, 0.8)} />
          <StripButton icon={Minus} label="Zoom out" disabled={!engine} onClick={() => engine && dolly(engine, 1.25)} />
          <StripButton
            icon={RotateCcw}
            label="Initial view"
            disabled={!engine}
            onClick={() => {
              applyFilter(isFactory ? { rack: 0, tier: 0 } : { shelf: 0 });
              if (isFactory) pf?.setView("iso");
              else ch?.setView("overview");
            }}
          />
          <Link to={isFactory ? "/erp/plant-factory" : "/erp/seedlings"} aria-label="Open full screen" className={`${stripButton} text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]`}>
            <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
            <span className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0F2F36] px-2 py-1 text-[12px] font-medium text-white opacity-0 transition-opacity group-hover/tool:opacity-100">Open full screen</span>
          </Link>

          {panel === "facility" && (
            <Flyout title="Facility" top={topOf(0)} onClose={() => setPanel(null)}>
              <div role="radiogroup" aria-label="Facility">
                {FACILITIES.map((f) => <Choice key={f.key} on={facility === f.key} onClick={() => onFacility(f.key)}>{f.label}</Choice>)}
              </div>
            </Flyout>
          )}
          {panel === "view" && (
            <Flyout title="Viewpoint" top={topOf(1)} onClose={() => setPanel(null)}>
              <div role="radiogroup" aria-label="Viewpoint">
                {isFactory
                  ? PF_VIEWS.map((v) => <Choice key={v.key} on={view === v.key} onClick={() => pf?.setView(v.key)}>{v.label}</Choice>)
                  : CHAMBER_VIEWS.map((v) => <Choice key={v.key} on={view === v.key} onClick={() => { applyFilter({ shelf: 0 }); ch?.setView(v.key); }}>{v.label}</Choice>)}
              </div>
            </Flyout>
          )}
          {panel === "light" && (
            <Flyout title="Lamp" note={MODEL_ONLY} top={topOf(2)} onClose={() => setPanel(null)}>
              <Toggle on={!!options.realLight} label={isFactory ? "Grow lamp light" : "Dark room, lamps on"} onClick={() => setOption({ realLight: !options.realLight })} />
            </Flyout>
          )}
          {panel === "door" && (
            <Flyout title={doorLabel} note={MODEL_ONLY} top={topOf(3)} onClose={() => setPanel(null)}>
              {isFactory ? (
                <>
                  <Toggle on={!!options.showCovers} label="Rack covers" onClick={() => setOption({ showCovers: !options.showCovers })} />
                  <Toggle on={!!options.showCeiling} label="Ceiling" onClick={() => setOption({ showCeiling: !options.showCeiling })} />
                  <Toggle on={!!options.lowWalls} label="Low wall" onClick={() => setOption({ lowWalls: !options.lowWalls })} />
                </>
              ) : (
                <>
                  <Toggle on={!!options.outerDoorOpen} label="Steel door open" onClick={() => setOption({ outerDoorOpen: !options.outerDoorOpen })} />
                  <Toggle on={!!options.glassDoorOpen} label="Glass door open" onClick={() => setOption({ glassDoorOpen: !options.glassDoorOpen })} />
                  <Toggle on={!!options.statusColors} label="Tray status colours" onClick={() => setOption({ statusColors: !options.statusColors })} />
                </>
              )}
            </Flyout>
          )}
          {panel === "filter" && (
            <Flyout title="Filter by rack" top={topOf(4)} onClose={() => setPanel(null)}>
              {isFactory ? (
                <div className="space-y-1.5 px-1 pb-1">
                  <FilterRow label="Rack" value={filter.rack ?? 0} options={RACK_NUMBERS} onChange={(rack) => applyFilter({ rack })} />
                  <FilterRow label="Tier" value={filter.tier ?? 0} options={TIER_NUMBERS} onChange={(tier) => applyFilter({ tier })} />
                </div>
              ) : (
                <div className="px-1 pb-1"><FilterRow label="Rack" value={filter.shelf ?? 0} options={SHELVES.map((s) => s.shelf as number)} onChange={(shelf) => applyFilter({ shelf })} /></div>
              )}
            </Flyout>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterRow({ label, value, options, onChange }: { label: string; value: number; options: readonly number[]; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-[#4F6B73]">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-[#EEF3F4] p-0.5 text-[12.5px] font-medium">
        {[0, ...options].map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={`h-6 min-w-[24px] rounded-md px-1.5 ${value === o ? "bg-white text-[#0F2F36] shadow-sm" : "text-[#4F6B73] hover:text-[#0F2F36]"}`}>
            {o === 0 ? "All" : o}
          </button>
        ))}
      </div>
    </div>
  );
}
