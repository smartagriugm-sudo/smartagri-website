import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CircleDot, Search, Sprout } from "lucide-react";
import { body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  PLANT_HEALTH_TONE,
  ROOM_LAYOUTS,
  dashboardScreen,
  growSystemFor,
  localizeSite,
  metricsFor,
  plantHealthLabel,
  plantPositionLabel,
  roomLocation,
  roomsAtSite,
  siteOf,
  stageLabel,
  statusLabel,
  zonesFor,
  ROOT_KEYS,
  STATUS_TONE,
  formatValue,
  plantingSummary,
  plantsFor,
  readingAt,
  statusOf,
  targetFor,
  type Plant,
  type PlantHealth,
  type Zone,
} from "../lib/indoor-dashboard";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import FacilityMap from "../components/dashboard/FacilityMap";
import { num } from "../components/dashboard/parts";
import { headLang, useLang, useT } from "../lib/i18n";

export const Route = createFileRoute("/indoor-farming_/dashboard/rooms")({
  component: RoomsScreen,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Ruang · Dashboard | smartagri" : "Rooms · Dashboard | smartagri" }] }),
});

type Filter = "all" | "active" | "attention" | "offline";

const FILTERS: { key: Filter; label: { en: string; id: string } }[] = [
  { key: "all", label: { en: "All", id: "Semua" } },
  { key: "active", label: { en: "Active", id: "Aktif" } },
  { key: "attention", label: { en: "Attention", id: "Perlu cek" } },
  { key: "offline", label: { en: "Offline", id: "Offline" } },
];

// Metrics driven by a schedule rather than held at a setpoint, so they are not
// coloured against a target band. Same exclusion the room rollup applies.
const SCHEDULED = new Set(["flow", "ppfd", "dli"]);

// How one planting position is drawn, per system. Bags and buckets are chunky
// and square-ish, gully holes are round because they are drilled holes, rack
// sites are small squares packed tight under a lamp, tray cells are smallest.
const SLOT_SHAPE: Record<string, string> = {
  polybag: "rounded-[5px] h-5",
  "dutch-bucket": "rounded-[3px] h-6",
  gully: "rounded-full h-4",
  "vertical-rack": "rounded-[2px] h-4",
  tray: "rounded-[2px] h-3.5",
};

// And how the row itself is drawn: a raised bed has a border, a gully is a
// sloped channel, a rack tier is a shelf with a lamp line above it.
const ROW_STYLE: Record<string, string> = {
  polybag: "gap-1 bg-[#FAFCFB] border border-[#0B6477]/10",
  "dutch-bucket": "gap-1.5 bg-[#FAFCFB] border border-[#0B6477]/10 border-l-4 border-l-[#14919B]/40",
  gully: "gap-1 bg-gradient-to-r from-[#E8F4F2] to-[#F3F7F6] border-y border-[#14919B]/25",
  "vertical-rack": "gap-0.5 bg-[#FAFCFB] border-t-2 border-t-[#eda100]/50 border-x border-b border-[#0B6477]/10",
  tray: "gap-0.5 bg-[#FAFCFB] border border-dashed border-[#0B6477]/15",
};

export default function RoomsScreen() {
  const { tick, zone, zoneId, setZoneId, zoneStatus } = useDashboard();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const lang = useLang();
  const t = useT();
  const NAV = dashboardScreen("/indoor-farming/dashboard/rooms", lang);

  const rooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return zonesFor(lang).filter((z) => {
      if (siteId && ROOM_LAYOUTS[z.id]?.siteId !== siteId) return false;
      if (q && !`${z.name} ${z.short} ${z.crop} ${z.stage}`.toLowerCase().includes(q)) {
        return false;
      }
      const status = zoneStatus(z);
      if (filter === "active") return z.online && status === "optimal";
      if (filter === "attention") return z.online && status !== "optimal";
      if (filter === "offline") return !z.online;
      return true;
    });
  }, [query, filter, siteId, tick, lang]);

  // Changing rooms must clear the open plant: the position it described belongs
  // to the room the operator just left.
  const selectRoom = (id: string) => {
    setZoneId(id);
    setSelectedPlant(null);
  };

  // Picking a site on the map narrows the rail, and it must move the main panel
  // too. Filtering to Magelang while the layout still drew a room in Yogyakarta
  // left the two halves of the screen describing different places.
  const selectSite = (next: string | null) => {
    setSiteId(next);
    if (!next) return;
    const here = roomsAtSite(next);
    if (here.length > 0 && !here.some((z) => z.id === zoneId)) {
      selectRoom(here[0].id);
    }
  };

  return (
    <>
      <ScreenHeading title={NAV.label} blurb={NAV.blurb} />

      {/* The rail grows with the viewport instead of sitting at a fixed 300px,
          which left it stranded on a wide screen. The 30% ceiling is the point:
          the rail gets easier to read, and the layout still holds the larger
          share at every width. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(320px,30%)_minmax(0,1fr)] items-start">
        <div className="flex flex-col gap-3">
          <Panel title={t({ en: "Facility sites", id: "Lokasi fasilitas" })}>
            <FacilityMap
              selectedSiteId={siteId}
              onSelectSite={selectSite}
              zoneStatus={zoneStatus}
            />
          </Panel>
          <RoomRail
          rooms={rooms}
          tick={tick}
          zoneId={zoneId}
          zoneStatus={zoneStatus}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
            onSelect={selectRoom}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <RoomLayoutPanel
            zone={zone}
            selected={selectedPlant}
            onSelect={setSelectedPlant}
          />
          {selectedPlant ? (
            <PlantDetail zone={zone} plant={selectedPlant} />
          ) : (
            <RoomReadings zone={zone} tick={tick} />
          )}
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- the rail */

function RoomRail({
  rooms,
  tick,
  zoneId,
  zoneStatus,
  query,
  setQuery,
  filter,
  setFilter,
  onSelect,
}: {
  rooms: Zone[];
  tick: number;
  zoneId: string;
  zoneStatus: (z: Zone) => keyof typeof STATUS_TONE;
  query: string;
  setQuery: (v: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  onSelect: (id: string) => void;
}) {
  const lang = useLang();
  const t = useT();
  const METRICS = metricsFor(lang);
  return (
    <div className="rounded-2xl border border-[#0B6477]/10 bg-white">
      <div className="border-b border-[#0B6477]/8 p-3">
        <label className="flex items-center gap-2 rounded-xl border border-[#0B6477]/10 bg-[#FAFCFB] px-3 h-9">
          <Search className="w-4 h-4 shrink-0 text-neutral-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t({ en: "Search rooms or crops", id: "Cari ruang atau tanaman" })}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-neutral-700 placeholder:text-neutral-300 outline-none"
            style={body}
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                f.key === filter
                  ? "bg-[#0B6477] text-white"
                  : "bg-[#0B6477]/8 text-[#0B6477] hover:bg-[#0B6477]/14"
              }`}
              style={body}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex max-h-[520px] xl:max-h-[680px] flex-col gap-2 overflow-y-auto p-3">
        {rooms.length === 0 && (
          <p className="py-6 text-center text-[12px] text-neutral-400" style={body}>
            {t({ en: "No room matches that search.", id: "Tidak ada ruang yang cocok dengan pencarian itu." })}
          </p>
        )}

        {rooms.map((z) => {
          const r = readingAt(z, tick);
          const status = zoneStatus(z);
          const layout = ROOM_LAYOUTS[z.id];
          const summary = plantingSummary(z);
          const system = growSystemFor(layout.system, lang);
          const selected = z.id === zoneId;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelect(z.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? "border-[#0B6477]/40 bg-[#F3F7F6]"
                  : "border-[#0B6477]/10 hover:border-[#14919B]/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <CircleDot
                    className="w-3 h-3 shrink-0"
                    style={{ color: z.online ? "#0E9F6E" : "#C4342F" }}
                  />
                  <span
                    className="truncate text-[14px] font-medium text-neutral-900"
                    style={display}
                  >
                    {z.short}
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    ...body,
                    color: z.online ? STATUS_TONE[status].color : "#9CA3AF",
                    backgroundColor: z.online ? STATUS_TONE[status].bg : "rgba(156,163,175,0.16)",
                  }}
                >
                  {z.online ? statusLabel(status, lang) : "Offline"}
                </span>
              </div>

              <div className="mt-1 truncate text-[12px] text-neutral-500" style={body}>
                {z.crop}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-neutral-400" style={body}>
                {localizeSite(siteOf(z.id), lang).city} · {roomLocation(z.id, lang)} · {z.area} m²
              </div>

              {z.online ? (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(["airTemp", "vpd", "ec"] as const).map((k) => (
                    <div key={k} className="rounded-lg bg-[#F3F7F6] px-2 py-1.5">
                      <div className="text-[10px] text-neutral-400 truncate" style={body}>
                        {METRICS[k].short}
                      </div>
                      <div
                        className="text-[13px] font-semibold tabular-nums"
                        style={{ ...display, color: STATUS_TONE[statusOf(k, r[k], z)].color }}
                      >
                        {formatValue(k, r[k], lang)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-lg bg-[#F3F7F6] px-2 py-1.5 text-[10px] text-neutral-400" style={body}>
                  {t({ en: "No readings, controller in maintenance", id: "Tidak ada bacaan, pengendali dalam pemeliharaan" })}
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-neutral-400" style={body}>
                <Sprout className="w-3 h-3 shrink-0" />
                {system.label} ·{" "}
                {t({
                  en: `${summary.planted} of ${summary.total} planted`,
                  id: `${summary.planted} dari ${summary.total} tertanam`,
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- the room layout */

function RoomLayoutPanel({
  zone,
  selected,
  onSelect,
}: {
  zone: Zone;
  selected: Plant | null;
  onSelect: (p: Plant | null) => void;
}) {
  const layout = ROOM_LAYOUTS[zone.id];
  const plants = useMemo(() => plantsFor(zone), [zone]);
  const summary = plantingSummary(zone);
  const lang = useLang();
  const t = useT();

  // One drawing per system. A polybag bed, a Dutch bucket line, a trapezoid
  // gully and a vertical rack tier do not look alike on the floor, and an
  // operator matching the screen to the room in front of them needs the screen
  // to look like the room.
  const system = growSystemFor(layout.system, lang);
  const shape = SLOT_SHAPE[layout.system];

  const rows = Array.from({ length: layout.rows }, (_, r) =>
    plants.filter((p) => p.row === r),
  );

  return (
    <Panel
      title={`${zone.name} · ${t({ en: "planting layout", id: "layout tanam" })}`}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {system.label} · {layout.rows} {system.rowPlural.toLowerCase()} ·{" "}
          {lang === "id"
            ? `masing-masing ${layout.perRow} ${system.slotPlural.toLowerCase()}`
            : `${layout.perRow} ${system.slotPlural.toLowerCase()} each`}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
        {(Object.keys(PLANT_HEALTH_TONE) as PlantHealth[]).map((h) => (
          <span key={h} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500" style={body}>
            <span
              className={`h-2.5 w-2.5 ${shape}`}
              style={{ backgroundColor: PLANT_HEALTH_TONE[h].color }}
            />
            {plantHealthLabel(h, lang)}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-neutral-400 tabular-nums" style={body}>
          {t({
            en: `${Math.round(summary.occupancy * 100)}% occupied · ${summary.ready} ready`,
            id: `${Math.round(summary.occupancy * 100)}% terisi · ${summary.ready} siap`,
          })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[520px] flex flex-col gap-2">
          {rows.map((cells, r) => (
            <div key={r} className="flex items-center gap-2">
              <span
                className="w-16 shrink-0 truncate text-[10px] text-neutral-400"
                style={body}
              >
                {system.rowLabel} {r + 1}
              </span>
              <div
                className={`flex min-w-0 flex-1 items-center rounded-lg p-1.5 ${ROW_STYLE[layout.system]}`}
              >
                {cells.map((p) => {
                  const tone = PLANT_HEALTH_TONE[p.health];
                  const isOpen = selected?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={`${plantPositionLabel(p, layout, lang)} · ${plantHealthLabel(p.health, lang)}`}
                      onClick={() => onSelect(isOpen ? null : p)}
                      className={`h-5 min-w-0 flex-1 ${shape} transition-transform hover:scale-110 ${
                        isOpen ? "ring-2 ring-[#0B6477] ring-offset-1" : ""
                      }`}
                      style={{
                        backgroundColor: p.health === "empty" ? "transparent" : tone.color,
                        border: p.health === "empty" ? `1px dashed ${tone.color}` : "none",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-neutral-400" style={body}>
        {system.note}{" "}
        {lang === "id"
          ? `Pilih ${system.slotLabel.toLowerCase()} mana pun untuk menelusuri batch, umur, dan masa panennya.`
          : `Select any ${system.slotLabel.toLowerCase()} to trace its batch, age, and harvest window.`}
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------- traceability card */

function PlantDetail({ zone, plant }: { zone: Zone; plant: Plant }) {
  const tone = PLANT_HEALTH_TONE[plant.health];
  const layout = ROOM_LAYOUTS[zone.id];
  const progress = Math.min(1, plant.age / plant.cycle);
  const remaining = Math.max(0, plant.cycle - plant.age);
  const lang = useLang();
  const t = useT();

  return (
    <Panel
      title={`${growSystemFor(layout.system, lang).slotLabel} ${plantPositionLabel(plant, layout, lang)}`}
      action={
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ ...body, color: tone.color, backgroundColor: tone.bg }}
        >
          {plantHealthLabel(plant.health, lang)}
        </span>
      }
    >
      {plant.health === "empty" ? (
        <p className="py-6 text-center text-[13px] text-neutral-400" style={body}>
          {t({
            en: "This position is empty and available for the next transplant.",
            id: "Posisi ini kosong dan siap untuk pindah tanam berikutnya.",
          })}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t({ en: "Variety", id: "Varietas" }), value: plant.variety },
              { label: t({ en: "Batch", id: "Batch" }), value: plant.batch },
              { label: t({ en: "Stage", id: "Fase" }), value: stageLabel(plant.stage, lang) },
              { label: t({ en: "Age", id: "Umur" }), value: t({ en: `${plant.age} days`, id: `${plant.age} hari` }) },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-[#FAFCFB] border border-[#0B6477]/8 px-3 py-2.5">
                <div className="text-[10px] text-neutral-400" style={body}>
                  {f.label}
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-neutral-800" style={display}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>

          {/* Transplant to harvest, as one bar. The point of the layout view is
              tracing a batch through time, so the position's place in its cycle
              is the thing worth drawing rather than another table row. */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[11px] text-neutral-500" style={body}>
              <span>{t({ en: "Transplant", id: "Pindah tanam" })}</span>
              <span className="tabular-nums">
                {remaining === 0
                  ? t({ en: "Ready to harvest", id: "Siap panen" })
                  : t({ en: `${remaining} days to harvest`, id: `${remaining} hari lagi panen` })}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#F3F7F6]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: progress >= 0.8 ? "#0E9F6E" : "#14919B",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-neutral-400 tabular-nums" style={body}>
              <span>{t({ en: "Day 0", id: "Hari 0" })}</span>
              <span>
                {t({ en: "Day", id: "Hari" })} {plant.cycle}
              </span>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- room readings */

function RoomReadings({ zone, tick }: { zone: Zone; tick: number }) {
  const reading = readingAt(zone, tick);
  const keys = [...AERIAL_KEYS, ...ROOT_KEYS];
  const lang = useLang();
  const t = useT();
  const METRICS = metricsFor(lang);

  return (
    <Panel
      title={`${t({ en: "All readings", id: "Semua bacaan" })} · ${zone.short}`}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {zone.crop}
        </span>
      }
    >
      {!zone.online ? (
        <p className="py-6 text-center text-[13px] text-neutral-400" style={body}>
          {t({ en: "This room is offline, so there is nothing to report.", id: "Ruang ini offline, jadi tidak ada yang bisa dilaporkan." })}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {keys.map((k) => {
            const metric = METRICS[k];
            const value = reading[k];
            const scheduled = SCHEDULED.has(k);
            const status = statusOf(k, value, zone);
            const tint = scheduled ? "#8A94A6" : STATUS_TONE[status].color;
            const [lo, hi] = targetFor(k, zone);
            return (
              <div
                key={k}
                className="flex items-center gap-3 rounded-xl border border-[#0B6477]/8 bg-[#FAFCFB] px-3.5 py-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${metric.tone}1A` }}
                >
                  <metric.icon className="w-4 h-4" style={{ color: metric.tone }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-neutral-400 truncate" style={body}>
                    {metric.label}
                  </div>
                  <div className="text-[10px] text-neutral-400" style={body}>
                    {lang === "id"
                      ? scheduled
                        ? `Terjadwal · ${num(lo, lang)} sampai ${num(hi, lang)} ${metric.unit} saat berjalan`
                        : `Target ${num(lo, lang)} sampai ${num(hi, lang)} ${metric.unit}`
                      : scheduled
                        ? `On schedule · ${lo} to ${hi} ${metric.unit} when running`
                        : `Target ${lo} to ${hi} ${metric.unit}`}
                  </div>
                </div>
                <span
                  className="text-[15px] font-semibold tabular-nums shrink-0"
                  style={{ ...display, color: tint }}
                >
                  {formatValue(k, value, lang)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
