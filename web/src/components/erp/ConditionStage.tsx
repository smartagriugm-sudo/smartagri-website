import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, GripVertical, PanelRightClose, PanelRightOpen } from "lucide-react";
import { axisTicks, conditionsAt, groupsAt, mergeSeries, metricColor, parseCustomRange, rowState, rowValue, sampleSeries, STATE_WORD, summarize, toDateTimeLocal, type ChartGroup, type ConditionRow, type Conditions } from "../../lib/pf/conditions";
import { fetchRecipeTargets, fetchSeries, formatValue, formatWithUnit, type PlaceCode, type Series } from "../../lib/pf/monitoring";
import type { ErpStore } from "../../lib/pf/store";
import FacilityViewer, { useLargeScreen, type Facility } from "./FacilityViewer";
import { useLoad } from "./page";
import SensorChart from "./SensorChart";
import TrendChart from "./TrendChart";
import { Segmented } from "./ui";

// The top of the front page: the 3D model and what the sensors say, on one line whose
// divide can be dragged. The model starts at three quarters and shortens down to one;
// as it does, the conditions card grows from its conclusions, in numbers, into the full
// chart with its own controls. Both follow the same facility. The chosen width survives
// leaving the page, but not a reload, since the project keeps no localStorage.

const MIN_SPLIT = 25;
const MAX_SPLIT = 75;
const MIDDLE_SPLIT = 50;
const KEY_STEP = 5;
const GAP = 16;
/** A chart needs both: room for its axes, and at least this share of the row, so a quarter stays numbers on any screen. */
const CHART_FROM_WIDTH = 560;
const CHART_FROM_SPLIT = 60;
/** With no chart, the numbers take two columns from this width instead of one long list. */
const TWO_COLUMNS_FROM_WIDTH = 420;
/** Without the model beside it, the card has no fixed height below this, so it stays numbers. */
const CHART_ALONE_FROM_WIDTH = 640;
const REFRESH_MS = 60_000;

const CUSTOM_RANGE = 0;
const RANGES = [
  { key: 6, label: "6 h" },
  { key: 24, label: "24 h" },
  { key: 168, label: "7 days" },
  { key: 720, label: "30 days" },
  { key: CUSTOM_RANGE, label: "Custom" },
];

let lastSplit = MAX_SPLIT;

const placeOf = (f: Facility): PlaceCode => (f === "plant-factory" ? "PF01" : "CH1");
const PLACES: { key: Facility; label: string }[] = [
  { key: "plant-factory", label: "Plant factory" },
  { key: "persemaian", label: "Seedlings" },
];

const columns = (split: number) => `calc((100% - ${GAP}px) * ${split / 100}) ${GAP}px minmax(0, 1fr)`;

/* ------------------------------------------------------------ the sensor data */

function useConditions(store: ErpStore, place: PlaceCode) {
  const here = [...store.batches.values()].filter((b) => (place === "CH1" ? store.traysOfBatch(b.code).length > 0 : store.holesOfBatch(b.code).length > 0));
  const batch = here[0] ?? null;
  const targets = useLoad(async () => (batch?.recipeId ? fetchRecipeTargets(batch.recipeId) : []), [batch?.recipeId]);
  const targetOf = (metric: string) => targets.data?.find((t) => t.phase === batch?.phaseKey && t.metric === metric) ?? null;
  return conditionsAt(place, store.monitoring?.assets ?? [], store.monitoring?.latest ?? [], targetOf);
}

/** The last day of every metric, for the numbers. Samples are drawn here, sensors are asked. */
function useDays(store: ErpStore, place: PlaceCode, conditions: Conditions) {
  const placeId = store.locationIds.get(place);
  const metrics = conditions.rows.map((r) => r.metric).join(",");
  const load = useLoad(async () => {
    const entries = await Promise.all(
      conditions.rows.map(async (r): Promise<[string, Series | null]> => {
        if (conditions.sample) return [r.metric, sampleSeries(r.metric, r.value ?? 0, 24, Date.now())];
        return [r.metric, placeId ? await fetchSeries(placeId, r.metric, 24) : null];
      }),
    );
    return new Map(entries);
  }, [placeId, metrics, conditions.sample]);
  return load;
}

/* ------------------------------------------------------------ the conclusions */

const STATE_CLASS = { ok: "text-[#4F6B73]", rendah: "font-medium text-[#8A5A07]", tinggi: "font-medium text-[#8A5A07]" };

function MetricRow({ row, day, selected, inChart, onPick }: { row: ConditionRow; day: Series | null | undefined; selected: boolean; inChart: boolean; onPick: () => void }) {
  const state = rowState(row);
  const range = summarize(day?.points ?? []);
  return (
    <li className="min-w-0 border-t border-[#EDF2F2] first:border-t-0 max-[639px]:[&:nth-child(2)]:border-t-0">
      <button
        type="button"
        onClick={onPick}
        aria-pressed={inChart ? selected : undefined}
        aria-label={inChart ? undefined : `${row.label} ${rowValue(row)} ${row.unit}. Open its chart`}
        className={`group block w-full px-4 py-2 text-left transition-colors ${selected && inChart ? "bg-[#EEF5F5]" : "hover:bg-[#F6F8F8]"}`}
      >
        <span className="flex items-baseline justify-between gap-2 text-[13px]">
          <span className={`flex min-w-0 items-center gap-1.5 ${selected && inChart ? "font-medium text-[#0F2F36]" : "text-[#4F6B73]"}`}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: metricColor(row.metric) }} /><span className="truncate">{row.label}</span></span>
          {state && <span className={`text-[12.5px] ${STATE_CLASS[state]}`}>{STATE_WORD[state]}</span>}
        </span>
        <span className="mt-0.5 block text-[#0F2F36]">
          <span className="text-[22px] font-semibold leading-tight tabular-nums tracking-[-0.02em]">{rowValue(row)}</span>
          {row.unit && <span className="ml-1 text-[13px] text-[#4F6B73]">{row.unit}</span>}
        </span>
        <span className="block truncate text-[12px] tabular-nums text-[#4F6B73]">
          {range ? `24 h: ${formatValue(row.metric, range.min)}–${formatValue(row.metric, range.max)}` : "24 h: no readings yet"}
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ the chart */

type ChartWindow = { from: number; to: number };

/** The series of the given parameters over a window. Samples are drawn here, sensors are asked. */
function useWindowSeries(store: ErpStore, place: PlaceCode, rows: readonly ConditionRow[], sample: boolean, window: ChartWindow) {
  const placeId = store.locationIds.get(place);
  const metrics = rows.map((r) => r.metric).join(",");
  const series = useLoad(async () => {
    const hours = Math.max(1, Math.ceil((Date.now() - window.from) / 3_600_000));
    const entries = await Promise.all(
      rows.map(async (r): Promise<[string, Series]> => {
        const got = sample ? sampleSeries(r.metric, r.value ?? 0, hours, Date.now()) : placeId ? await fetchSeries(placeId, r.metric, hours) : { stepMinutes: 5, points: [] };
        return [r.metric, { ...got, points: got.points.filter((p) => { const t = new Date(p.t).getTime(); return t >= window.from && t <= window.to; }) }];
      }),
    );
    return new Map(entries);
  }, [placeId, metrics, sample, window.from, window.to]);
  const reload = series.reload;
  useEffect(() => {
    if (sample) return;
    const t = globalThis.setInterval(() => void reload(), REFRESH_MS);
    return () => globalThis.clearInterval(t);
  }, [sample, reload]);
  return series;
}

function RangeFields({ initial, onApply, onError }: { initial: ChartWindow; onApply: (w: ChartWindow) => void; onError: string | null }) {
  const [fromText, setFromText] = useState(() => toDateTimeLocal(initial.from));
  const [toText, setToText] = useState(() => toDateTimeLocal(initial.to));
  const [error, setError] = useState(onError);
  const field = "h-8 rounded-lg border border-[#C9D6D8] bg-white px-2 text-[13px] tabular-nums text-[#0F2F36]";
  const apply = () => {
    const result = parseCustomRange(fromText, toText, Date.now());
    if ("error" in result) return setError(result.error);
    setError(null);
    onApply(result);
  };
  return (
    <form className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-[#4F6B73]" onSubmit={(e) => { e.preventDefault(); apply(); }}>
      <label className="flex items-center gap-1.5">From<input type="datetime-local" value={fromText} max={toDateTimeLocal(Date.now())} onChange={(e) => setFromText(e.target.value)} className={field} /></label>
      <label className="flex items-center gap-1.5">To<input type="datetime-local" value={toText} max={toDateTimeLocal(Date.now())} onChange={(e) => setToText(e.target.value)} className={field} /></label>
      <button type="submit" className="h-8 rounded-lg bg-[#45DFB1] px-3 text-[13px] font-medium text-[#0B2A22] hover:bg-[#80ED99]">Apply</button>
      {error && <span role="alert" className="basis-full text-[#B3362C]">{error}</span>}
    </form>
  );
}

function SingleChart({ row, series, window, height }: { row: ConditionRow; series: Series | undefined; window: ChartWindow; height: number }) {
  const points = series?.points ?? [];
  return <SensorChart metric={row.metric} points={points} stepMinutes={series?.stepMinutes ?? 15} from={window.from} to={window.to} band={row.band} height={height} tableless />;
}

/** Up to four parameters together, each on an axis of its own, in its own units. */
function GroupChart({ group, rows, data, window, height, hidden, focus }: { group: ChartGroup; rows: readonly ConditionRow[]; data: Map<string, Series> | null; window: ChartWindow; height: number; hidden: ReadonlySet<string>; focus: string | null }) {
  const shown = rows.filter((r) => !hidden.has(r.metric));
  const step = shown.map((r) => data?.get(r.metric)?.stepMinutes).find((m) => m) ?? 15;
  const merged = useMemo(() => mergeSeries(shown.map((r) => ({ key: r.metric, points: data?.get(r.metric)?.points ?? [] })), step), [data, step, shown.map((r) => r.metric).join()]);
  const lines = useMemo(
    () =>
      shown.map((r) => {
        const { ticks, decimals } = axisTicks(r.metric, (data?.get(r.metric)?.points ?? []).map((p) => p.v));
        return {
          key: r.metric,
          label: r.label,
          color: metricColor(r.metric),
          format: (v: number) => formatWithUnit(r.metric, v),
          axis: { ticks, title: r.unit.replace(" RH", "") || r.label, format: (v: number) => v.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) },
        };
      }),
    [data, shown.map((r) => r.metric).join()],
  );
  return (
    <TrendChart
      lines={lines}
      rows={merged}
      from={window.from}
      to={window.to}
      height={height}
      focus={focus}
      summary={`Combined chart ${group.label}: ${shown.map((r) => r.label).join(", ")}. Each line has its own vertical axis, in its own units.`}
    />
  );
}

/** The chart with its controls: one parameter, or a set of them on axes of their own. Also used by the Conditions page. */
export function ChartPane({ store, place, row, rows, sample }: { store: ErpStore; place: PlaceCode; row: ConditionRow; rows: readonly ConditionRow[]; sample: boolean }) {
  const [hours, setHours] = useState(24);
  const [mode, setMode] = useState("single");
  const [custom, setCustom] = useState<ChartWindow | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [legendFocus, setLegendFocus] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(() => Date.now());

  const groups = groupsAt(rows.map((r) => r.metric));
  const group = groups.find((g) => g.key === mode) ?? null;

  // Picking a parameter outside the drawn set shows that parameter on its own.
  useEffect(() => {
    setMode((m) => (groups.find((g) => g.key === m)?.metrics.includes(row.metric) ? m : "single"));
  }, [row.metric]);
  const members = group ? rows.filter((r) => group.metrics.includes(r.metric)).sort((a, b) => group.metrics.indexOf(a.metric) - group.metrics.indexOf(b.metric)) : [row];
  const window: ChartWindow = hours === CUSTOM_RANGE && custom ? custom : { from: anchor - (hours === CUSTOM_RANGE ? 72 : hours) * 3_600_000, to: anchor };

  const series = useWindowSeries(store, place, members, sample, window);

  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const sized = new ResizeObserver(() => setHeight(el.clientHeight));
    sized.observe(el);
    return () => sized.disconnect();
  }, []);

  const single = series.data?.get(row.metric);
  const stats = group ? null : summarize(single?.points ?? []);
  const figure = (label: string, v: number) => (
    <span className="whitespace-nowrap text-[12.5px] text-[#4F6B73]">{label} <span className="font-medium tabular-nums text-[#0F2F36]">{formatValue(row.metric, v)}</span></span>
  );
  const empty = members.every((r) => !series.data?.get(r.metric)?.points.length);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-2 pt-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {groups.length > 0 && <Segmented value={mode} options={[{ key: "single", label: "One parameter" }, ...groups.map((g) => ({ key: g.key, label: g.label }))]} onChange={setMode} />}
        <Segmented value={hours} options={RANGES} onChange={(h) => { setHours(h); setAnchor(Date.now()); }} />
      </div>
      {hours === CUSTOM_RANGE && <RangeFields initial={window} onApply={setCustom} onError={null} />}
      {group ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
          {members.map((r) => {
            const off = hidden.has(r.metric);
            return (
              <button
                key={r.metric}
                type="button"
                aria-pressed={!off}
                title={off ? `Show ${r.label}` : `Hide ${r.label}`}
                onClick={() => setHidden((now) => { const next = new Set(now); if (!next.delete(r.metric)) next.add(r.metric); return next; })}
                onPointerEnter={() => setLegendFocus(r.metric)}
                onPointerLeave={() => setLegendFocus(null)}
                onFocus={() => setLegendFocus(r.metric)}
                onBlur={() => setLegendFocus(null)}
                className={`flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[12.5px] hover:bg-[#F3F7F7] ${off ? "text-[#8FA3A8]" : "text-[#36525A]"}`}
              >
                <span className="h-[3px] w-3.5 rounded-full" style={{ background: off ? "#C9D6D8" : metricColor(r.metric) }} />
                {r.label}
                {r.unit && <span className="text-[#6B8187]">{r.unit.replace(" RH", "")}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-[14px] font-medium text-[#0F2F36]">{row.label}{row.unit && <span className="ml-1 font-normal text-[#4F6B73]">{row.unit}</span>}</p>
          {stats && <span className="flex flex-wrap gap-x-3">{figure("Lowest", stats.min)}{figure("Average", stats.avg)}{figure("Highest", stats.max)}</span>}
        </div>
      )}
      <div ref={box} className="mt-1.5 min-h-0 flex-1">
        {series.error ? (
          <p className="grid h-full place-items-center text-[14px] text-[#4F6B73]">The chart cannot be loaded yet.</p>
        ) : empty && series.loading ? (
          <p className="grid h-full place-items-center text-[14px] text-[#4F6B73]">Loading chart…</p>
        ) : empty ? (
          <p className="grid h-full place-items-center text-[14px] text-[#4F6B73]">No readings in this range.</p>
        ) : height > 0 ? (
          group ? <GroupChart group={group} rows={members} data={series.data} window={window} height={height} hidden={hidden} focus={legendFocus} /> : <SingleChart row={row} series={single} window={window} height={height} />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- the card */

function ConditionsCard({ store, facility, onFacility, conditions, split, onSplit, showModel }: { store: ErpStore; facility: Facility; onFacility: (f: Facility) => void; conditions: Conditions; split: number; onSplit: (v: number) => void; showModel: boolean }) {
  const place = placeOf(facility);
  const box = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const days = useDays(store, place, conditions);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const sized = new ResizeObserver(() => setWidth(el.clientWidth));
    sized.observe(el);
    return () => sized.disconnect();
  }, []);

  const wide = showModel ? width >= CHART_FROM_WIDTH && split <= CHART_FROM_SPLIT : width >= CHART_ALONE_FROM_WIDTH;
  const twoColumns = !wide && showModel && width >= TWO_COLUMNS_FROM_WIDTH;
  const row = conditions.rows.find((r) => r.metric === chosen) ?? conditions.rows[0] ?? null;
  const pick = (metric: string) => {
    setChosen(metric);
    if (!wide && showModel) onSplit(MIDDLE_SPLIT);
  };

  const growing = split > MIN_SPLIT;
  const GrowIcon = growing ? PanelRightOpen : PanelRightClose;

  return (
    <section ref={box} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[#DCE7E8] bg-white sm:h-full" aria-labelledby="conditions-title">
      <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[#EDF2F2] pl-4 pr-2 py-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 id="conditions-title" className="whitespace-nowrap text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Conditions</h2>
          <span className="truncate text-[12.5px] text-[#4F6B73]">{place}</span>
          {conditions.sample && <span className="whitespace-nowrap rounded-md bg-[#FFF6E5] px-1.5 py-0.5 text-[12px] font-medium text-[#8A5A07]">Sample</span>}
        </div>
        <div className="flex items-center gap-1">
          {(wide || !showModel) && <Segmented value={facility} options={PLACES} onChange={onFacility} />}
          {showModel && (
            <button type="button" onClick={() => onSplit(growing ? MIN_SPLIT : MAX_SPLIT)} aria-label={growing ? "Widen chart" : "Shrink chart"} title={growing ? "Widen chart" : "Shrink chart"} className="grid h-8 w-8 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]">
              <GrowIcon className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 ${wide ? "flex-row" : "flex-col"}`}>
        <ul className={`min-h-0 ${wide ? "w-[192px] shrink-0 overflow-y-auto border-r border-[#EDF2F2] [scrollbar-width:thin]" : showModel && !twoColumns ? "flex-1 overflow-y-auto" : twoColumns ? "grid flex-1 auto-rows-min grid-cols-2 overflow-y-auto [scrollbar-width:thin]" : "grid grid-cols-2 sm:flex-1"}`}>
          {conditions.rows.map((r) => (
            <MetricRow key={r.metric} row={r} day={days.data?.get(r.metric)} selected={r.metric === row?.metric} inChart={wide} onPick={() => pick(r.metric)} />
          ))}
        </ul>
        {wide && row && <ChartPane key={place} store={store} place={place} row={row} rows={conditions.rows} sample={conditions.sample} />}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#EDF2F2] px-4 py-1.5 text-[12.5px]">
        <span className="truncate text-[#4F6B73]">{conditions.sample ? "Sensors not connected yet" : "From sensors"}</span>
        <Link to="/erp/monitoring" className="inline-flex min-h-[28px] shrink-0 items-center gap-1 font-medium text-[#0B6477] hover:underline">Details <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ the divide */

export default function ConditionStage({ store }: { store: ErpStore }) {
  const large = useLargeScreen();
  const [facility, setFacility] = useState<Facility>("plant-factory");
  const [split, setSplitState] = useState(lastSplit);
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<{ left: number; width: number; value: number } | null>(null);
  const conditions = useConditions(store, placeOf(facility));

  const setSplit = useCallback((v: number) => {
    const next = Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, v));
    lastSplit = next;
    setSplitState(next);
  }, []);

  const valueAt = (clientX: number) => {
    const d = drag.current!;
    return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ((clientX - d.left - GAP / 2) / (d.width - GAP)) * 100));
  };

  // While dragging, the width goes straight to the grid so the page does not re-render on every pixel.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = grid.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { left: rect.left, width: rect.width, value: split };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !grid.current) return;
    drag.current.value = valueAt(e.clientX);
    grid.current.style.gridTemplateColumns = columns(drag.current.value);
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const { value } = drag.current;
    drag.current = null;
    setSplit(value);
  };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const to = e.key === "ArrowLeft" ? split - KEY_STEP : e.key === "ArrowRight" ? split + KEY_STEP : e.key === "Home" ? MIN_SPLIT : e.key === "End" ? MAX_SPLIT : null;
    if (to === null) return;
    e.preventDefault();
    setSplit(to);
  };

  if (!large) {
    return (
      <div className="sm:h-[440px]">
        <ConditionsCard store={store} facility={facility} onFacility={setFacility} conditions={conditions} split={MAX_SPLIT} onSplit={() => {}} showModel={false} />
      </div>
    );
  }

  return (
    <div
      ref={grid}
      className="grid h-[clamp(420px,calc(100vh-380px),640px)]"
      style={{ gridTemplateColumns: columns(split) }}
    >
      <FacilityViewer store={store} facility={facility} onFacility={setFacility} conditions={conditions} />
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Width of the 3D model. Press the left or right arrow to change it."
        aria-valuemin={MIN_SPLIT}
        aria-valuemax={MAX_SPLIT}
        aria-valuenow={Math.round(split)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setSplit(split > MIDDLE_SPLIT ? MIN_SPLIT : MAX_SPLIT)}
        title="Drag to change the width. Double-click to switch ends."
        className="group/split relative flex cursor-col-resize touch-none items-center justify-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0B6477]"
      >
        <span className="grid h-12 w-[10px] place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#9AAEB2] transition-colors group-hover/split:border-[#14919B] group-hover/split:text-[#0B6477] group-active/split:border-[#14919B]">
          <GripVertical className="h-3 w-3" strokeWidth={2} />
        </span>
      </div>
      <ConditionsCard store={store} facility={facility} onFacility={setFacility} conditions={conditions} split={split} onSplit={setSplit} showModel />
    </div>
  );
}

