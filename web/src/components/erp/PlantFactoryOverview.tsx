import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ObjectRecord, Selection, ViewName } from "plant-factory-3d";
import { ArrowRight, Cctv, CircleAlert, Home, Lightbulb, LightbulbOff, Minus, MoveRight, Plus } from "lucide-react";
import { LIVE_FEED, cctvFeed, feedLabel } from "../../lib/pf/cctv";
import { useLang, useT, type Bi, type Lang } from "../../lib/i18n";
import { formatLongDate } from "../../lib/pf/dashboard";
import { CHAMBER_CODE } from "../../lib/pf/chamber";
import { CctvViewer } from "./Cctv";
import {
  FACILITY_CODE,
  GROW_ROOM_READINGS,
  HOLES_PER_RACK,
  HOLES_TOTAL,
  HOLE_STATE_KEYS,
  RESERVOIR_READINGS,
  countByState,
  holeStateLabel,
  isPlanted,
  localizeReadings,
  stateColor,
} from "../../lib/pf/facility";
import { RACK_NUMBERS, TIER_NUMBERS, type PfProvider } from "../../lib/pf/provider";
import type { ErpStore } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import PlantFactoryScene, { type SceneEngine } from "./PlantFactoryScene";
import { formatValue, formatWithUnit } from "../../lib/pf/monitoring";
import SceneHoverCard, { sceneFacts, useSceneHover, zoomToCursor } from "./SceneHoverCard";
import { Bar, Card, Kpi, Lifecycle, Note, PanelHeader, Readings, Rows, SceneStatus, Segmented, StateBreakdown, dolly, useEngineActivity, useSceneGate } from "./ui";
import { FactoryPlan, LayoutSwitch, type LayoutMode } from "./LayoutPlan";
import { HoleEditor } from "./SpotEditor";

// ERP overview: the 3D model of PF01 with floating KPI cards, a detail panel
// that follows whatever is selected in the scene, and a batch lifecycle strip.
//
// The scene mounts only after hydration, so the server sends a plain
// placeholder. Selecting a hole needs one tier filtered, because the rack
// covers and lights sit on top of the holes in the full view.

const VIEWS: { key: ViewName; label: Bi }[] = [
  { key: "iso", label: { en: "Isometric", id: "Isometrik" } },
  { key: "top", label: { en: "Top", id: "Atas" } },
  { key: "grow", label: { en: "Grow room", id: "Ruang tanam" } },
  { key: "control", label: { en: "Control room", id: "Ruang kontrol" } },
];


/* --------------------------------------------------------- detail panels */

function HolePanel({ id, store }: { id: string; store: ErpStore }) {
  const hole = store.pf.getHole(id)!;
  const b = store.batch(hole.batch);
  const germination = b ? store.germinationOf(b.code) : null;
  const t = useT();
  const lang = useLang();
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={t({ en: "Planting hole", id: "Lubang tanam" })} title={id} sub={t({ en: `Rack ${hole.rack} · Tier ${hole.tier} · Gully ${hole.gully} · Hole ${hole.hole}`, id: `Rack ${hole.rack} · Tingkat ${hole.tier} · Gully ${hole.gully} · Lubang ${hole.hole}` })} />
      {b ? (
        <div className="space-y-2">
          <Rows rows={[["Status", holeStateLabel(hole.state, lang)], ["Batch", b.code], [t({ en: "Crop", id: "Tanaman" }), b.crop], [t({ en: "Recipe", id: "Resep" }), b.recipe], [t({ en: "Sowing date", id: "Tanggal semai" }), b.sownAt], [t({ en: "Age", id: "Umur" }), t({ en: `${b.age} of ${b.cycle} days`, id: `${b.age} dari ${b.cycle} hari` })]]} />
          <Bar value={Math.min(b.age, b.cycle)} max={b.cycle || 1} />
          {hole.note && <Note>{hole.note}</Note>}
        </div>
      ) : (
        <Note>{hole.state === "sanitasi" ? t({ en: "This hole is being sanitised.", id: "Lubang ini sedang disanitasi." }) : hole.offline ? t({ en: "This hole is out of use.", id: "Lubang ini tidak dipakai." }) : t({ en: "No batch in this hole.", id: "Tidak ada batch di lubang ini." })}</Note>
      )}
      {b && germination && (
        <div className="space-y-2 rounded-lg bg-[#F3F7F7] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#4F6B73]">{t({ en: "From the seedling chamber", id: "Dari ruang bibit" })}</p>
          <Rows
            rows={[
              [t({ en: "Transplant", id: "Pindah tanam" }), b.transplantedAt ? formatLongDate(b.transplantedAt, lang) : t({ en: "Not recorded", id: "Tidak tercatat" })],
              [t({ en: "Batch germination", id: "Perkecambahan batch" }), `${Math.round(germination.rate * 100)}%`],
              ...(hole.sourceSlot ? ([[t({ en: "Source tray", id: "Tray asal" }), hole.sourceSlot]] as [string, string][]) : []),
            ]}
          />
          {hole.sourceSlot && (
            <Link to="/erp/seedlings" search={{ slot: hole.sourceSlot }} className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
              {t({ en: "Open its spot in the seedling chamber", id: "Buka posisinya di ruang bibit" })} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
      <HoleEditor id={id} store={store} />
      {b?.id && (
        <Link to="/erp/batch/$id" params={{ id: b.id }} search={{ hole: id }} className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
          {t({ en: "Open the batch", id: "Buka batch" })} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function objectTitle(o: ObjectRecord, lang: Lang) {
  const id = lang === "id";
  switch (o.type) {
    case "lamp": return id ? `Lampu, Rack ${o.rack} · Tingkat ${o.tier}` : `Lamp, Rack ${o.rack} · Tier ${o.tier}`;
    case "pump": return o.rack ? (id ? `Pompa, Rack ${o.rack}` : `Pump, Rack ${o.rack}`) : id ? "Pompa utama" : "Main pump";
    case "sensor_climate": return id ? `Sensor iklim, Rack ${o.rack}` : `Climate sensor, Rack ${o.rack}`;
    case "sensor_nutrient": return id ? "Sensor nutrisi" : "Nutrient sensor";
    case "tank": return id ? "Tangki nutrisi" : "Nutrient tank";
    case "cctv": {
      const feed = cctvFeed(o.id);
      return feed ? feedLabel(feed, lang) : id ? "Kamera" : "Camera";
    }
    default: return o.id;
  }
}

function ObjectPanel({ object: o, provider }: { object: ObjectRecord; provider: PfProvider }) {
  const lampOn = provider.lamps.get(o.id);
  const pumpOn = provider.pumps.get(o.id);
  const t = useT();
  const lang = useLang();
  const sample = t({ en: "Sample readings", id: "Pembacaan contoh" });
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={o.id} title={objectTitle(o, lang)} />
      {o.assumed && (
        <Note tone="warn">
          <CircleAlert className="mr-1 inline h-3.5 w-3.5" />
          {t({ en: "Whether it exists and where it sits are still assumed, not confirmed.", id: "Keberadaan dan posisinya masih perkiraan, belum dipastikan." })}
        </Note>
      )}
      {o.type === "lamp" && <Rows rows={[["Status", lampOn ? t({ en: "On", id: "Menyala" }) : t({ en: "Off", id: "Mati" })]]} />}
      {o.type === "pump" && <Rows rows={[["Status", pumpOn ? t({ en: "In progress", id: "Berjalan" }) : t({ en: "Stopped", id: "Berhenti" })]]} />}
      {(o.type === "lamp" || o.type === "pump") && (
        <Note>{t({ en: "Sample status. Control is not available, since commands to a device must go through authentication, permissions and confirmation.", id: "Status contoh. Kontrol belum tersedia, karena perintah ke perangkat harus melalui autentikasi, izin, dan konfirmasi." })}</Note>
      )}
      {o.type === "sensor_climate" && <Readings title={sample} items={localizeReadings(GROW_ROOM_READINGS, lang)} />}
      {o.type === "sensor_nutrient" && <Readings title={sample} items={localizeReadings(RESERVOIR_READINGS, lang)} />}
      {o.type === "tank" && (
        <>
          <Readings title={t({ en: "Nutrient solution (sample)", id: "Larutan nutrisi (contoh)" })} items={localizeReadings(RESERVOIR_READINGS, lang)} />
          <div>
            <div className="mb-1 flex justify-between text-[13px]"><span className="text-[#4F6B73]">{t({ en: "Tank level", id: "Level tangki" })}</span><span className="font-medium">74%</span></div>
            <Bar value={74} max={100} color="#0AD1C8" />
          </div>
        </>
      )}
      {o.type === "cctv" && (cctvFeed(o.id) ? <CctvViewer feed={cctvFeed(o.id)!} /> : <Note>{t({ en: "No camera feed connected yet.", id: "Belum ada siaran kamera yang terhubung." })}</Note>)}
    </div>
  );
}

function RackPanel({ rack, store, onTier }: { rack: number; store: ErpStore; onTier: (tier: number) => void }) {
  const holes = store.pf.holesOfRack(rack);
  const t = useT();
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`${FACILITY_CODE} · R${rack}`} title={`Rack ${rack}`} sub={t({ en: "3 tiers · 4 gullies · 20 holes per gully", id: "3 tingkat · 4 gully · 20 lubang per gully" })} />
      <StateBreakdown counts={countByState(holes)} total={holes.length} />
      <div className="space-y-2.5">
        {[...TIER_NUMBERS].reverse().map((n) => {
          const ts = holes.filter((h) => h.tier === n);
          const b = store.batch(ts.find((h) => h.batch)?.batch);
          return (
            <button key={n} type="button" onClick={() => onTier(n)} className="block w-full rounded-lg border border-[#E3ECED] px-3 py-2.5 text-left hover:border-[#14919B]">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-[#0F2F36]">{t({ en: `Tier ${n}`, id: `Tingkat ${n}` })}</span>
                <span className="text-[#4F6B73]">{ts.filter((h) => isPlanted(h.state)).length}/{ts.length} {t({ en: "filled", id: "terisi" })}</span>
              </div>
              {b ? (
                <>
                  <p className="mt-0.5 text-[12.5px] text-[#4F6B73]">{b.code} · {b.crop} · {t({ en: "day", id: "hari" })} {b.age}/{b.cycle}</p>
                  <div className="mt-1.5"><Bar value={Math.min(b.age, b.cycle)} max={b.cycle || 1} /></div>
                </>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-[#4F6B73]">{t({ en: "No active batch", id: "Tidak ada batch aktif" })}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeedlingSupply({ store }: { store: ErpStore }) {
  const ready = store.readyToMove();
  const seedlings = ready.reduce((n, r) => n + r.seedlings, 0);
  const germinating = store.batchesInChamber().filter((b) => !ready.some((r) => r.batch.code === b.code));
  const t = useT();
  return (
    <Link to="/erp/seedlings" className="block rounded-lg border border-[#E3ECED] px-3 py-2.5 hover:border-[#14919B]">
      <span className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#0F2F36]">{t({ en: "Supply from the seedling chamber", id: "Pasokan dari ruang bibit" })} · {CHAMBER_CODE}</span>
        <MoveRight className="h-4 w-4 text-[#0B6477]" />
      </span>
      <span className="mt-0.5 block text-[12.5px] text-[#4F6B73]">
        {t({
          en: `${seedlings} seedlings ready to transplant · ${germinating.length} batches still germinating · ${store.freeCapacity()} holes ready to receive`,
          id: `${seedlings} bibit siap pindah tanam · ${germinating.length} batch masih berkecambah · ${store.freeCapacity()} lubang siap menerima`,
        })}
      </span>
    </Link>
  );
}

function FacilityPanel({ store, onRack }: { store: ErpStore; onRack: (rack: number) => void }) {
  const provider = store.pf;
  const t = useT();
  const lang = useLang();
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`Plant factory · ${FACILITY_CODE}`} title="Smart Agriculture Research Center" sub={t({ en: "Grow room (2 NFT racks) and control room", id: "Ruang tanam (2 rack NFT) dan ruang kontrol" })} />
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-[#4F6B73]">{t({ en: `${store.batchesInFactory().length} active batches`, id: `${store.batchesInFactory().length} batch aktif` })}</span>
      </div>
      <StateBreakdown counts={countByState(provider.holes.values())} total={HOLES_TOTAL} />
      <SeedlingSupply store={store} />
      {store.monitoring?.latest.some((r) => r.location_code === FACILITY_CODE) ? (
        <Link to="/erp/monitoring" className="block rounded-lg border border-[#E3ECED] px-3 py-2 text-[13.5px] font-medium text-[#0B6477] hover:border-[#14919B]">{t({ en: "View grow room sensor readings", id: "Lihat pembacaan sensor ruang tanam" })}</Link>
      ) : (
        <Readings title={t({ en: "Grow room (sample)", id: "Ruang tanam (contoh)" })} items={localizeReadings(GROW_ROOM_READINGS, lang)} />
      )}
      <div className="space-y-2">
        {RACK_NUMBERS.map((r) => {
          const n = provider.holesOfRack(r).filter((h) => isPlanted(h.state)).length;
          return (
            <button key={r} type="button" onClick={() => onRack(r)} className="block w-full rounded-lg border border-[#E3ECED] px-3 py-2 text-left hover:border-[#14919B]">
              <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium text-[#0F2F36]">Rack {r}</span><span className="text-[#4F6B73]">{n}/{HOLES_PER_RACK}</span></div>
              <Bar value={n} max={HOLES_PER_RACK} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- page */

type Props = { active: boolean; preload: boolean; onSceneReady: () => void; focusHole?: string };

export default function PlantFactoryOverview({ active, preload, onSceneReady, focusHole }: Props) {
  const store = useErpStore();
  const provider = store.pf;
  const sceneOn = useSceneGate(active || preload);
  const [engine, setEngine] = useState<SceneEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [filter, setFilterState] = useState({ rack: 0, tier: 0 });
  const [view, setViewState] = useState<ViewName>("iso");
  const [realLight, setRealLight] = useState(false);
  const [covers, setCovers] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>("3d");
  const sceneBox = useRef<HTMLDivElement>(null);
  const t = useT();
  const lang = useLang();
  const { target: hovered, card: hoverCard, place: placeHover } = useSceneHover(engine, sceneBox);

  const onReady = useCallback((e: SceneEngine) => {
    e.on("filter", setFilterState);
    e.on("view", setViewState);
    zoomToCursor(e);
    // The covers would stop the pointer reaching the plants below them.
    e.setOptions({ showCovers: false });
    setEngine(e);
    onSceneReady();
  }, [onSceneReady]);
  const onError = useCallback((e: unknown) => {
    console.error("The 3D model could not be loaded", e);
    setFailed(true);
  }, []);

  useEngineActivity(engine, active);

  // New records arrive after the model does, and whenever a batch page saves.
  useEffect(() => {
    engine?.refresh();
  }, [engine, store.dataVersion]);

  useEffect(() => {
    if (engine && active && focusHole) engine.focusHole(focusHole);
  }, [engine, active, focusHole]);

  const hoverFacts = sceneFacts(store, engine, hovered, lang);

  // A pick on the plan is a pick in the model too, so the two never disagree.
  const pickHole = (id: string) => {
    setSelection({ kind: "hole", id } as Selection);
    engine?.focusHole(id);
  };

  const roomTemp = store.reading(FACILITY_CODE, "suhu");
  const roomRh = store.reading(FACILITY_CODE, "rh");
  const tankEc = store.reading(FACILITY_CODE, "ec");
  const tankPh = store.reading(FACILITY_CODE, "ph");
  const counts = countByState(provider.holes.values());
  const filled = HOLE_STATE_KEYS.filter(isPlanted).reduce((n, s) => n + counts[s], 0);

  // The lifecycle strip follows the selected hole's batch, else the batch nearest harvest.
  const selectedBatch = selection?.kind === "hole" ? store.batch(provider.getHole(selection.id)?.batch) : undefined;
  const focusBatch = selectedBatch ?? store.batchesInFactory().sort((a, b) => b.age / b.cycle - a.age / a.cycle)[0];

  const selectedObject = selection?.kind === "object" ? engine?.manifest.objects.find((o) => o.id === selection.id) : undefined;

  const tool = "grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]";
  const toggle = "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[12.5px] font-medium text-[#36525A] hover:bg-[#EEF5F5]";

  return (
      <main className="relative flex-1 bg-[#E7EAE7] lg:h-[calc(100vh-76px)] lg:min-h-[640px]">
        <h1 className="sr-only">Plant factory</h1>
        {/* Scene */}
        <div ref={sceneBox} className="relative h-[62vh] min-h-[420px] lg:absolute lg:bottom-[172px] lg:left-0 lg:right-[392px] lg:top-0 lg:h-auto">
          <div className={`absolute inset-y-0 left-0 ${layout === "both" ? "w-1/2" : "w-full"} ${layout === "2d" ? "invisible" : ""}`}>
            {sceneOn && <PlantFactoryScene provider={provider} onReady={onReady} onSelect={setSelection} onError={onError} />}
          </div>
          {!engine && layout !== "2d" && <SceneStatus failed={failed} facility="plantFactory" />}
          {layout !== "3d" && (
            <div className={`absolute inset-y-0 right-0 overflow-y-auto border-l border-[#DCE7E8] bg-white px-4 pb-4 pt-4 lg:pb-[104px] lg:pt-[112px] ${layout === "both" ? "w-1/2" : "w-full"}`}>
              <FactoryPlan store={store} selected={selection?.kind === "hole" ? selection.id : null} rack={filter.rack} tier={filter.tier} onPick={pickHole} />
            </div>
          )}
          {hoverFacts && hovered?.id !== selection?.id && <SceneHoverCard facts={hoverFacts} cardRef={hoverCard} place={placeHover} />}

          <Card className={`absolute flex flex-col p-1 ${layout === "2d" ? "hidden" : layout === "both" ? "right-[calc(50%+12px)] top-3 lg:top-[112px]" : "right-3 top-3 lg:top-4"}`}>
            <button type="button" className={tool} onClick={() => engine && dolly(engine, 0.8)} aria-label={t({ en: "Zoom in", id: "Perbesar" })}><Plus className="h-4 w-4" /></button>
            <button type="button" className={tool} onClick={() => engine && dolly(engine, 1.25)} aria-label={t({ en: "Zoom out", id: "Perkecil" })}><Minus className="h-4 w-4" /></button>
            <button
              type="button"
              className={tool}
              aria-label={t({ en: "Initial view", id: "Tampilan awal" })}
              onClick={() => {
                engine?.setView("iso");
                engine?.setFilter({ rack: 0, tier: 0 });
                engine?.select(null);
              }}
            >
              <Home className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={tool}
              aria-label={t({ en: "Camera", id: "Kamera" })}
              aria-pressed={selection?.kind === "object" && selection.id === LIVE_FEED.id}
              onClick={() => {
                const camera = { kind: "object", id: LIVE_FEED.id } as Selection;
                engine?.setView("grow");
                engine?.select(camera);
                setSelection(camera);
                // Below lg the detail panel sits under the model, out of sight.
                if (!window.matchMedia("(min-width: 1024px)").matches) {
                  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  requestAnimationFrame(() => document.getElementById("pf-detail")?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }));
                }
              }}
            >
              <Cctv className="h-4 w-4" />
            </button>
          </Card>
        </div>

        {/* KPI cards */}
        <div className="flex gap-3 overflow-x-auto px-3 py-3 lg:pointer-events-none lg:absolute lg:left-4 lg:right-[404px] lg:top-4 lg:p-0 lg:pb-3">
          <div className="flex gap-3 lg:pointer-events-auto">
            <Kpi label={t({ en: "Holes filled", id: "Lubang terisi" })} value={store.hasData ? `${filled}` : "-"} sub={t({ en: `of ${HOLES_TOTAL} holes · ${FACILITY_CODE}`, id: `dari ${HOLES_TOTAL} lubang · ${FACILITY_CODE}` })} />
            <Kpi label={t({ en: "Ready to harvest", id: "Siap panen" })} value={store.hasData ? `${counts.siap_panen}` : "-"} sub={t({ en: "plants, by recipe", id: "tanaman, menurut resep" })} />
            {roomTemp !== null ? (
              <Kpi label={t({ en: "Grow room temperature", id: "Suhu ruang tanam" })} value={formatWithUnit("suhu", roomTemp, lang)} sub={roomRh !== null ? `RH ${formatWithUnit("rh", roomRh, lang)}` : t({ en: "from sensors", id: "dari sensor" })} />
            ) : (
              <Kpi label={t({ en: "Grow room temperature", id: "Suhu ruang tanam" })} value={t({ en: "22.4 °C", id: "22,4 °C" })} sub={t({ en: "sample · RH 68% · CO₂ 812 ppm", id: "contoh · RH 68% · CO₂ 812 ppm" })} />
            )}
            {tankEc !== null ? (
              <Kpi label={t({ en: "Tank", id: "Tangki" })} value={`EC ${formatValue("ec", tankEc, lang)}`} sub={tankPh !== null ? `pH ${formatValue("ph", tankPh, lang)}` : t({ en: "from sensors", id: "dari sensor" })} />
            ) : (
              <Kpi label={t({ en: "Tank", id: "Tangki" })} value={t({ en: "EC 1.62", id: "EC 1,62" })} sub={t({ en: "sample · pH 6.48", id: "contoh · pH 6,48" })} />
            )}
          </div>
        </div>

        {/* View, filters, legend */}
        <div className="px-3 pb-3 lg:pointer-events-none lg:absolute lg:bottom-[172px] lg:left-4 lg:right-[404px] lg:p-0">
          <Card className="space-y-2 px-3 py-2.5 lg:pointer-events-auto">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <LayoutSwitch value={layout} onChange={setLayout} />
              <Segmented label={t({ en: "View", id: "Tampilan" })} value={view} options={VIEWS.map((v) => ({ key: v.key, label: t(v.label) }))} onChange={(v) => engine?.setView(v)} />
              <Segmented label="Rack" value={filter.rack} options={[{ key: 0, label: t({ en: "All", id: "Semua" }) }, ...RACK_NUMBERS.map((r) => ({ key: r, label: `${r}` }))]} onChange={(rack) => engine?.setFilter({ rack })} />
              <Segmented label={t({ en: "Tier", id: "Tingkat" })} value={filter.tier} options={[{ key: 0, label: t({ en: "All", id: "Semua" }) }, ...TIER_NUMBERS.map((n) => ({ key: n, label: `${n}` }))]} onChange={(tier) => engine?.setFilter({ tier })} />
              <button
                type="button"
                className={toggle}
                aria-pressed={realLight}
                onClick={() => {
                  engine?.setOptions({ realLight: !realLight });
                  setRealLight(!realLight);
                }}
              >
                {realLight ? <Lightbulb className="h-4 w-4 text-[#D63FB8]" /> : <LightbulbOff className="h-4 w-4" />}
                {t({ en: "Grow light", id: "Lampu tanam" })}
              </button>
              <button
                type="button"
                className={toggle}
                aria-pressed={covers}
                onClick={() => {
                  engine?.setOptions({ showCovers: !covers });
                  setCovers(!covers);
                }}
              >
                <span className={`h-3 w-3 rounded-sm border ${covers ? "border-[#14919B] bg-[#14919B]" : "border-[#9AAEB2]"}`} />
                {t({ en: "Rack covers", id: "Penutup rack" })}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {HOLE_STATE_KEYS.map((s) => (
                <span key={s} className="flex items-center gap-1 text-[12px] text-[#4F6B73]">
                  <span className="h-2 w-2 rounded-full" style={{ background: stateColor(s) }} />
                  {holeStateLabel(s, lang)}
                </span>
              ))}
              <span className="text-[12px] text-[#4F6B73] lg:ml-auto">{t({ en: "Click a plant or a hole to change it", id: "Klik tanaman atau lubang untuk mengubahnya" })}</span>
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        <div id="pf-detail" className="scroll-mt-[88px] px-3 pb-3 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:w-[360px] lg:p-0">
          <Card className="h-full overflow-y-auto p-4">
            {selection?.kind === "hole" ? (
              <HolePanel id={selection.id} store={store} />
            ) : selectedObject ? (
              <ObjectPanel object={selectedObject} provider={provider} />
            ) : filter.rack ? (
              <RackPanel rack={filter.rack} store={store} onTier={(tier) => engine?.setFilter({ tier })} />
            ) : (
              <FacilityPanel store={store} onRack={(rack) => engine?.setFilter({ rack })} />
            )}
          </Card>
        </div>

        {/* Lifecycle */}
        <div className="px-3 pb-6 lg:absolute lg:bottom-4 lg:left-4 lg:right-[404px] lg:p-0">
          {focusBatch && <Lifecycle batch={focusBatch} phase={store.phaseOf(focusBatch)} />}
        </div>
      </main>
  );
}

