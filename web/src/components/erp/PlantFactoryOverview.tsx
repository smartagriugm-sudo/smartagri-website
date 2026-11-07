import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ObjectRecord, Selection, ViewName } from "plant-factory-3d";
import { ArrowRight, CircleAlert, Home, Lightbulb, LightbulbOff, Minus, MoveRight, Plus } from "lucide-react";
import { CHAMBER_CODE } from "../../lib/pf/chamber";
import {
  FACILITY_CODE,
  GROW_ROOM_READINGS,
  HOLES_PER_RACK,
  HOLES_TOTAL,
  HOLE_STATES,
  HOLE_STATE_KEYS,
  RESERVOIR_READINGS,
  countByState,
  isPlanted,
  stateColor,
} from "../../lib/pf/facility";
import { RACK_NUMBERS, TIER_NUMBERS, type PfProvider } from "../../lib/pf/provider";
import type { ErpStore } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import PlantFactoryScene, { type SceneEngine } from "./PlantFactoryScene";
import { formatLongDate } from "../../lib/pf/dashboard";
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

const VIEWS: { key: ViewName; label: string }[] = [
  { key: "iso", label: "Isometric" },
  { key: "top", label: "Top" },
  { key: "grow", label: "Grow room" },
  { key: "control", label: "Control room" },
];


/* --------------------------------------------------------- detail panels */

function HolePanel({ id, store }: { id: string; store: ErpStore }) {
  const hole = store.pf.getHole(id)!;
  const b = store.batch(hole.batch);
  const germination = b ? store.germinationOf(b.code) : null;
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow="Planting hole" title={id} sub={`Rack ${hole.rack} · Tier ${hole.tier} · Gully ${hole.gully} · Hole ${hole.hole}`} />
      {b ? (
        <div className="space-y-2">
          <Rows rows={[["Status", HOLE_STATES[hole.state].label], ["Batch", b.code], ["Crop", b.crop], ["Recipe", b.recipe], ["Sowing date", b.sownAt], ["Age", `${b.age} of ${b.cycle} days`]]} />
          <Bar value={Math.min(b.age, b.cycle)} max={b.cycle || 1} />
          {hole.note && <Note>{hole.note}</Note>}
        </div>
      ) : (
        <Note>{hole.state === "sanitasi" ? "This hole is being sanitised." : hole.offline ? "This hole is out of use." : "No batch in this hole."}</Note>
      )}
      {b && germination && (
        <div className="space-y-2 rounded-lg bg-[#F3F7F7] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#4F6B73]">From the seedling chamber</p>
          <Rows
            rows={[
              ["Transplant", b.transplantedAt ? formatLongDate(b.transplantedAt) : "Not recorded"],
              ["Batch germination", `${Math.round(germination.rate * 100)}%`],
              ...(hole.sourceSlot ? ([["Source tray", hole.sourceSlot]] as [string, string][]) : []),
            ]}
          />
          {hole.sourceSlot && (
            <Link to="/erp/seedlings" search={{ slot: hole.sourceSlot }} className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
              Open its spot in the seedling chamber <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
      <HoleEditor id={id} store={store} />
      {b?.id && (
        <Link to="/erp/batch/$id" params={{ id: b.id }} search={{ hole: id }} className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
          Open the batch <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function objectTitle(o: ObjectRecord) {
  switch (o.type) {
    case "lamp": return `Lamp, Rack ${o.rack} · Tier ${o.tier}`;
    case "pump": return o.rack ? `Pump, Rack ${o.rack}` : "Main pump";
    case "sensor_climate": return `Climate sensor, Rack ${o.rack}`;
    case "sensor_nutrient": return "Nutrient sensor";
    case "tank": return "Nutrient tank";
    case "cctv": return o.id === "CCTV-GROW" ? "Grow room CCTV" : "Control room CCTV";
    default: return o.id;
  }
}

function ObjectPanel({ object: o, provider }: { object: ObjectRecord; provider: PfProvider }) {
  const lampOn = provider.lamps.get(o.id);
  const pumpOn = provider.pumps.get(o.id);
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={o.id} title={objectTitle(o)} />
      {o.assumed && (
        <Note tone="warn">
          <CircleAlert className="mr-1 inline h-3.5 w-3.5" />
          Whether it exists and where it sits are still assumed, not confirmed.
        </Note>
      )}
      {o.type === "lamp" && <Rows rows={[["Status", lampOn ? "On" : "Off"]]} />}
      {o.type === "pump" && <Rows rows={[["Status", pumpOn ? "In progress" : "Stopped"]]} />}
      {(o.type === "lamp" || o.type === "pump") && (
        <Note>Sample status. Control is not available, since commands to a device must go through authentication, permissions and confirmation.</Note>
      )}
      {o.type === "sensor_climate" && <Readings title="Sample readings" items={GROW_ROOM_READINGS} />}
      {o.type === "sensor_nutrient" && <Readings title="Sample readings" items={RESERVOIR_READINGS} />}
      {o.type === "tank" && (
        <>
          <Readings title="Nutrient solution (sample)" items={RESERVOIR_READINGS} />
          <div>
            <div className="mb-1 flex justify-between text-[13px]"><span className="text-[#4F6B73]">Tank level</span><span className="font-medium">74%</span></div>
            <Bar value={74} max={100} color="#0AD1C8" />
          </div>
        </>
      )}
      {o.type === "cctv" && <Note>No camera feed connected yet.</Note>}
    </div>
  );
}

function RackPanel({ rack, store, onTier }: { rack: number; store: ErpStore; onTier: (tier: number) => void }) {
  const holes = store.pf.holesOfRack(rack);
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`${FACILITY_CODE} · R${rack}`} title={`Rack ${rack}`} sub="3 tiers · 4 gullies · 20 holes per gully" />
      <StateBreakdown counts={countByState(holes)} total={holes.length} />
      <div className="space-y-2.5">
        {[...TIER_NUMBERS].reverse().map((t) => {
          const ts = holes.filter((h) => h.tier === t);
          const b = store.batch(ts.find((h) => h.batch)?.batch);
          return (
            <button key={t} type="button" onClick={() => onTier(t)} className="block w-full rounded-lg border border-[#E3ECED] px-3 py-2.5 text-left hover:border-[#14919B]">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-[#0F2F36]">Tier {t}</span>
                <span className="text-[#4F6B73]">{ts.filter((h) => isPlanted(h.state)).length}/{ts.length} filled</span>
              </div>
              {b ? (
                <>
                  <p className="mt-0.5 text-[12.5px] text-[#4F6B73]">{b.code} · {b.crop} · day {b.age}/{b.cycle}</p>
                  <div className="mt-1.5"><Bar value={Math.min(b.age, b.cycle)} max={b.cycle || 1} /></div>
                </>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-[#4F6B73]">No active batch</p>
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
  return (
    <Link to="/erp/seedlings" className="block rounded-lg border border-[#E3ECED] px-3 py-2.5 hover:border-[#14919B]">
      <span className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#0F2F36]">Supply from the seedling chamber · {CHAMBER_CODE}</span>
        <MoveRight className="h-4 w-4 text-[#0B6477]" />
      </span>
      <span className="mt-0.5 block text-[12.5px] text-[#4F6B73]">
        {seedlings} seedlings ready to transplant · {germinating.length} batches still germinating · {store.freeCapacity()} holes ready to receive
      </span>
    </Link>
  );
}

function FacilityPanel({ store, onRack }: { store: ErpStore; onRack: (rack: number) => void }) {
  const provider = store.pf;
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`Plant factory · ${FACILITY_CODE}`} title="Smart Agriculture Research Center" sub="Grow room (2 NFT racks) and control room" />
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-[#4F6B73]">{store.batchesInFactory().length} active batches</span>
      </div>
      <StateBreakdown counts={countByState(provider.holes.values())} total={HOLES_TOTAL} />
      <SeedlingSupply store={store} />
      {store.monitoring?.latest.some((r) => r.location_code === FACILITY_CODE) ? (
        <Link to="/erp/monitoring" className="block rounded-lg border border-[#E3ECED] px-3 py-2 text-[13.5px] font-medium text-[#0B6477] hover:border-[#14919B]">View grow room sensor readings</Link>
      ) : (
        <Readings title="Grow room (sample)" items={GROW_ROOM_READINGS} />
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

  const hoverFacts = sceneFacts(store, engine, hovered);

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
        {/* Scene */}
        <div ref={sceneBox} className="relative h-[62vh] min-h-[420px] lg:absolute lg:bottom-[172px] lg:left-0 lg:right-[392px] lg:top-0 lg:h-auto">
          <div className={`absolute inset-y-0 left-0 ${layout === "both" ? "w-1/2" : "w-full"} ${layout === "2d" ? "invisible" : ""}`}>
            {sceneOn && <PlantFactoryScene provider={provider} onReady={onReady} onSelect={setSelection} onError={onError} />}
          </div>
          {!engine && layout !== "2d" && <SceneStatus failed={failed} />}
          {layout !== "3d" && (
            <div className={`absolute inset-y-0 right-0 overflow-y-auto border-l border-[#DCE7E8] bg-white px-4 pb-4 pt-4 lg:pb-[104px] lg:pt-[112px] ${layout === "both" ? "w-1/2" : "w-full"}`}>
              <FactoryPlan store={store} selected={selection?.kind === "hole" ? selection.id : null} rack={filter.rack} tier={filter.tier} onPick={pickHole} />
            </div>
          )}
          {hoverFacts && hovered?.id !== selection?.id && <SceneHoverCard facts={hoverFacts} cardRef={hoverCard} place={placeHover} />}

          <Card className={`absolute flex flex-col p-1 ${layout === "2d" ? "hidden" : layout === "both" ? "right-[calc(50%+12px)] top-3 lg:top-[112px]" : "right-3 top-3 lg:top-4"}`}>
            <button type="button" className={tool} onClick={() => engine && dolly(engine, 0.8)} aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
            <button type="button" className={tool} onClick={() => engine && dolly(engine, 1.25)} aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
            <button
              type="button"
              className={tool}
              aria-label="Initial view"
              onClick={() => {
                engine?.setView("iso");
                engine?.setFilter({ rack: 0, tier: 0 });
                engine?.select(null);
              }}
            >
              <Home className="h-4 w-4" />
            </button>
          </Card>
        </div>

        {/* KPI cards */}
        <div className="flex gap-3 overflow-x-auto px-3 py-3 lg:pointer-events-none lg:absolute lg:left-4 lg:right-[404px] lg:top-4 lg:p-0 lg:pb-3">
          <div className="flex gap-3 lg:pointer-events-auto">
            <Kpi label="Holes filled" value={store.hasData ? `${filled}` : "-"} sub={`of ${HOLES_TOTAL} holes · ${FACILITY_CODE}`} />
            <Kpi label="Ready to harvest" value={store.hasData ? `${counts.siap_panen}` : "-"} sub="plants, by recipe" />
            {roomTemp !== null ? (
              <Kpi label="Grow room temperature" value={formatWithUnit("suhu", roomTemp)} sub={roomRh !== null ? `RH ${formatWithUnit("rh", roomRh)}` : "from sensors"} />
            ) : (
              <Kpi label="Grow room temperature" value="22.4 °C" sub="sample · RH 68% · CO₂ 812 ppm" />
            )}
            {tankEc !== null ? (
              <Kpi label="Tank" value={`EC ${formatValue("ec", tankEc)}`} sub={tankPh !== null ? `pH ${formatValue("ph", tankPh)}` : "from sensors"} />
            ) : (
              <Kpi label="Tank" value="EC 1.62" sub="sample · pH 6.48" />
            )}
          </div>
        </div>

        {/* View, filters, legend */}
        <div className="px-3 pb-3 lg:pointer-events-none lg:absolute lg:bottom-[172px] lg:left-4 lg:right-[404px] lg:p-0">
          <Card className="space-y-2 px-3 py-2.5 lg:pointer-events-auto">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <LayoutSwitch value={layout} onChange={setLayout} />
              <Segmented label="View" value={view} options={VIEWS} onChange={(v) => engine?.setView(v)} />
              <Segmented label="Rack" value={filter.rack} options={[{ key: 0, label: "All" }, ...RACK_NUMBERS.map((r) => ({ key: r, label: `${r}` }))]} onChange={(rack) => engine?.setFilter({ rack })} />
              <Segmented label="Tier" value={filter.tier} options={[{ key: 0, label: "All" }, ...TIER_NUMBERS.map((t) => ({ key: t, label: `${t}` }))]} onChange={(tier) => engine?.setFilter({ tier })} />
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
                Grow light
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
                Rack covers
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {HOLE_STATE_KEYS.map((s) => (
                <span key={s} className="flex items-center gap-1 text-[12px] text-[#4F6B73]">
                  <span className="h-2 w-2 rounded-full" style={{ background: stateColor(s) }} />
                  {HOLE_STATES[s].label}
                </span>
              ))}
              <span className="text-[12px] text-[#4F6B73] lg:ml-auto">Click a plant or a hole to change it</span>
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="px-3 pb-3 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:w-[360px] lg:p-0">
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

