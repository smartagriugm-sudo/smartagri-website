import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChamberSelection, Selection } from "plant-factory-3d";
import { Box, Home, Minus, Plus } from "lucide-react";
import { SHELVES, slotStatesIn, type ChamberProvider } from "../../lib/pf/chamber";
import { HOLE_STATES } from "../../lib/pf/facility";
import { useLang, useT, type Lang } from "../../lib/i18n";
import { RACK_NUMBERS, TIER_NUMBERS, type PfProvider } from "../../lib/pf/provider";
import { useErpStore } from "./ErpContext";
import PlantFactoryScene, { type SceneEngine } from "./PlantFactoryScene";
import SeedChamberScene, { type ChamberEngine } from "./SeedChamberScene";
import SceneHoverCard, { sceneFacts, useSceneHover, zoomToCursor } from "./SceneHoverCard";
import { Card, SceneStatus, Segmented, dolly } from "./ui";

// A 3D model on the batch page to choose trays or holes in, and to see how they
// stand. It is its own engine, apart from the facility screens, so it can paint
// what this batch has chosen without changing those screens: the provider it is
// given wraps the shared one and swaps a spot's state for a marker state.
//
//   chosen  teal, a tray or hole about to be used
//   other   grey, a spot held by another batch (its plants still show their size)
//
// The real state is never written; the marks live only in this picker.

export type Mark = "chosen" | "other" | null;

const CHOSEN = 0x14919b;
const OTHER = 0xc4ced0;

const chosenWord = (lang: Lang) => (lang === "id" ? "Dipilih" : "Chosen");
const otherWord = (lang: Lang) => (lang === "id" ? "Batch lain" : "Another batch");

const slotStatesFor = (lang: Lang) => ({
  pilih: { label: chosenWord(lang), color: CHOSEN, plant: 0, plugs: true, lid: false },
  ...Object.fromEntries(Object.entries(slotStatesIn(lang)).map(([k, v]) => [`lain_${k}`, { ...v, label: otherWord(lang), color: OTHER }])),
});
const holeStatesFor = (lang: Lang) => ({
  pilih: { label: chosenWord(lang), color: CHOSEN, plant: 0 },
  ...Object.fromEntries(Object.entries(HOLE_STATES).map(([k, v]) => [`lain_${k}`, { ...v, label: otherWord(lang), color: OTHER }])),
});

const READING_ID: Record<string, string> = { suhu: "Suhu", rh: "Kelembapan", lux: "Cahaya" };

const tool = "grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]";

type Props = {
  kind: "chamber" | "factory";
  /** How a spot is marked; read on every refresh, so it may change between renders. */
  mark: (id: string) => Mark;
  onPick: (id: string) => void;
  /** Keeps the clicked spot outlined, for a picker of one; a picker of many shows its picks by colour instead. */
  single?: boolean;
  /** A spot to show, with its shelf or tier filtered in. */
  focus?: string | null;
  /** Shown under the model, beside the legend. */
  hint: string;
  legend: { label: string; color: string }[];
};

export default function BatchPicker3D({ kind, mark, onPick, single = false, focus, hint, legend }: Props) {
  const store = useErpStore();
  const t = useT();
  const lang = useLang();
  const slotStates = useMemo(() => slotStatesFor(lang), [lang]);
  const holeStates = useMemo(() => holeStatesFor(lang), [lang]);
  const langRef = useRef(lang);
  langRef.current = lang;
  const [engine, setEngine] = useState<SceneEngine | ChamberEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState({ rack: 0, tier: 0, shelf: 0 });
  const box = useRef<HTMLDivElement>(null);
  const { target: hovered, card, place } = useSceneHover(engine, box);
  // A phone at the rack works from the list; the model, heavy there, opens on request.
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 640px)").matches);
  }, []);

  // The engine keeps the provider it was made with, so the marks go through a ref.
  const markRef = useRef(mark);
  markRef.current = mark;
  const pickRef = useRef({ onPick, single });
  pickRef.current = { onPick, single };

  const provider = useMemo(() => {
    if (kind === "chamber") {
      const base = store.chamber;
      return {
        lamps: base.lamps,
        readings: () => {
          const r = base.readings();
          if (langRef.current !== "id") return r;
          return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, label: READING_ID[k] ?? v.label }]));
        },
        getSlot: (id: string) => {
          const s = base.getSlot(id);
          const m = markRef.current(id);
          if (!s || !m) return s;
          return { ...s, state: m === "chosen" ? "pilih" : `lain_${s.state}` };
        },
      } as unknown as ChamberProvider;
    }
    const base = store.pf;
    return {
      lamps: base.lamps,
      pumps: base.pumps,
      getHole: (id: string) => {
        const h = base.getHole(id);
        const m = markRef.current(id);
        if (!h || !m) return h;
        return { ...h, state: m === "chosen" ? "pilih" : `lain_${h.state}` };
      },
    } as unknown as PfProvider;
  }, [kind, store]);

  const onSelect = useCallback((s: Selection | ChamberSelection | null) => {
    if (!s || (s.kind !== "hole" && s.kind !== "slot")) return;
    pickRef.current.onPick(s.id);
    // A picker of many shows its picks by colour, so the outline would only mislead.
    if (!pickRef.current.single) queueMicrotask(() => engineRef.current?.select(null));
  }, []);
  const engineRef = useRef<SceneEngine | ChamberEngine | null>(null);

  const onReady = useCallback((e: SceneEngine | ChamberEngine) => {
    engineRef.current = e;
    zoomToCursor(e);
    if ("focusSlot" in e) {
      e.on("filter", (f) => setFilter((o) => ({ ...o, shelf: f.shelf })));
      e.setOptions({ statusColors: true, outerDoorOpen: true, glassDoorOpen: true });
    } else {
      e.on("filter", (f) => setFilter((o) => ({ ...o, rack: f.rack, tier: f.tier })));
      e.setOptions({ showCovers: false });
      // The whole room is too small to pick a hole in at this size; the grow room fills the frame.
      e.setView("grow");
    }
    setEngine(e);
  }, []);
  const onError = useCallback((e: unknown) => {
    console.error("The 3D model could not be loaded", e);
    setFailed(true);
  }, []);

  // Cheap enough to redraw every spot on each render, and the marks may have moved.
  useEffect(() => {
    engine?.refresh();
  });

  useEffect(() => {
    if (!engine || !focus) return;
    if ("focusSlot" in engine) engine.focusSlot(focus);
    else engine.focusHole(focus);
  }, [engine, focus]);

  const facts = sceneFacts(store, engine, hovered, lang);
  const home = () => {
    if (!engine) return;
    engine.select(null);
    if ("focusSlot" in engine) {
      engine.setFilter({ shelf: 0 });
      engine.setView("overview");
    } else {
      engine.setFilter({ rack: 0, tier: 0 });
      engine.setView("grow");
    }
  };

  if (open === false) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#C9D8DA] bg-[#F6F8F8] px-3 py-2.5 text-[14px] font-medium text-[#0B6477] hover:border-[#14919B]">
        <Box className="h-4 w-4" aria-hidden /> {kind === "chamber" ? t({ en: "Show the growth chamber in 3D", id: "Tampilkan growth chamber dalam 3D" }) : t({ en: "Show the plant factory in 3D", id: "Tampilkan plant factory dalam 3D" })}
      </button>
    );
  }
  if (open === null) return <div className="h-[340px] rounded-lg border border-[#E3ECED] bg-[#E7EAE7] sm:h-[420px]" />;

  return (
    <div className="overflow-hidden rounded-lg border border-[#E3ECED]">
      <div ref={box} className="relative h-[340px] bg-[#E7EAE7] sm:h-[420px]">
        {kind === "chamber" ? (
          <SeedChamberScene provider={provider as ChamberProvider} states={slotStates} onReady={onReady} onSelect={onSelect} onError={onError} />
        ) : (
          <PlantFactoryScene provider={provider as PfProvider} states={holeStates} onReady={onReady} onSelect={onSelect} onError={onError} />
        )}
        {!engine && <SceneStatus failed={failed} facility={kind === "chamber" ? "chamber" : "plantFactory"} />}
        {facts && <SceneHoverCard facts={facts} cardRef={card} place={place} showCamera={false} />}
        <Card className="absolute right-3 top-3 flex flex-col p-1">
          <button type="button" className={tool} onClick={() => engine && dolly(engine, 0.8)} aria-label={t({ en: "Zoom in", id: "Perbesar" })}><Plus className="h-4 w-4" /></button>
          <button type="button" className={tool} onClick={() => engine && dolly(engine, 1.25)} aria-label={t({ en: "Zoom out", id: "Perkecil" })}><Minus className="h-4 w-4" /></button>
          <button type="button" className={tool} onClick={home} aria-label={t({ en: "Initial view", id: "Tampilan awal" })}><Home className="h-4 w-4" /></button>
        </Card>
      </div>
      <div className="space-y-2 border-t border-[#E3ECED] bg-white px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {kind === "chamber" ? (
            <Segmented label={t({ en: "Shelf", id: "Rak" })} value={filter.shelf} options={[{ key: 0, label: t({ en: "All", id: "Semua" }) }, ...SHELVES.map((s) => ({ key: s.shelf as number, label: `${s.shelf}` }))]} onChange={(shelf) => (engine as ChamberEngine | null)?.setFilter({ shelf })} />
          ) : (
            <>
              <Segmented label={t({ en: "Rack", id: "Rak" })} value={filter.rack} options={[{ key: 0, label: t({ en: "All", id: "Semua" }) }, ...RACK_NUMBERS.map((r) => ({ key: r, label: `${r}` }))]} onChange={(rack) => (engine as SceneEngine | null)?.setFilter({ rack })} />
              <Segmented label="Tier" value={filter.tier} options={[{ key: 0, label: t({ en: "All", id: "Semua" }) }, ...TIER_NUMBERS.map((n) => ({ key: n, label: `${n}` }))]} onChange={(tier) => (engine as SceneEngine | null)?.setFilter({ tier })} />
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-[12px] text-[#4F6B73]">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="text-[12px] text-[#4F6B73] sm:ml-auto">{hint}</span>
        </div>
      </div>
    </div>
  );
}

/** Legend colours for the two marks, matching the model. */
export const MARK_LEGEND = {
  chosen: { label: "Chosen", color: "#14919B" },
  other: { label: "Another batch", color: "#C4CED0" },
};
