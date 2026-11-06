import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { SHELVES, slotColor, SLOT_STATE_KEYS, SLOT_STATES, type Slot } from "../../lib/pf/chamber";
import { batchStage, fetchBatches, fetchSeedLots, batchLabel, jakartaToday } from "../../lib/pf/batch";
import { HOLES_TOTAL, HOLE_STATE_KEYS, HOLE_STATES, addDays, isPlanted, stateColor, type Hole, type HoleState } from "../../lib/pf/facility";
import { fetchFoundationSummary } from "../../lib/pf/foundation";
import { buildWork, formatShortDate, positionOf, scheduleBar, scheduleWindow, weekTicks, workSummary, type BatchWork, type WorkItem, type WorkLink, type WorkTone } from "../../lib/pf/dashboard";
import { ago, formatWithUnit, latestAt, metricInfo } from "../../lib/pf/monitoring";
import { fetchPlans, fetchWorkOrders } from "../../lib/pf/cost";
import { attendanceFlags, buildRoster, clockText, contractEndingSoon, fetchAllContracts, fetchAttendance, fetchLeaves, fetchPeople, fetchShifts } from "../../lib/pf/people";
import { fetchItems, fetchOpenShortages, fetchPurchaseOrders, fetchStockLots, formatQty } from "../../lib/pf/inventory";
import { fetchAvailableLots, fetchInvoices, fetchOrders, formatKg, formatRupiah, roundKg } from "../../lib/pf/sales";
import { addDays as addCalendarDays } from "../../lib/pf/facility";
import { toErpError } from "../../lib/pf/foundation";
import { cropLabel } from "../../lib/pf/foundation";
import type { ErpStore } from "../../lib/pf/store";
import { RACK_NUMBERS, TIER_NUMBERS } from "../../lib/pf/provider";
import { useErpStore } from "./ErpContext";
import FacilityViewer, { useLargeScreen } from "./FacilityViewer";
import { ErpPage, ErrorNote, SLOW_TEXT, formatDateTime, useErpAccess, useLoad, useSlow } from "./page";

// The ERP's front page answers one question: what needs doing today? The queue of
// work comes first, beside the live 3D model. Under them, how full the two
// facilities are, drawn from their own tiers and trays, then every running batch
// on one calendar. Rows one and two span the same width: 1fr + 16 + 1fr.
// Flat panels on purpose: a 1px edge and no shadow, as the taste skill's app rules ask.

const panel = "rounded-xl border border-[#DCE7E8] bg-white";
const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const WORK_SHOWN = 6;
const WORK_SHOWN_ON_PHONE = 4;

/* ------------------------------------------------------------- reading the store */

function batchWork(store: ErpStore): BatchWork[] {
  return [...store.batches.values()].map((b) => {
    const holes = store.holesOfBatch(b.code);
    const trays = store.traysOfBatch(b.code);
    return {
      id: b.id,
      code: b.code,
      crop: b.crop,
      sownAt: b.sownAt,
      age: b.age,
      cycle: b.cycle,
      transplantDay: b.transplantDay,
      plants: holes.length,
      harvestReady: holes.filter((h) => h.state === "siap_panen").length,
      problemHoles: holes.filter((h) => h.state === "masalah").map((h) => h.id),
      problemTrays: trays.filter((t) => t.state === "masalah").map((t) => t.id),
      readySeedlings: trays.filter((t) => t.state === "siap_pindah").reduce((n, t) => n + t.germinated, 0),
    };
  });
}

async function fetchRecords() {
  const [batches, lots, setup] = await Promise.all([fetchBatches(), fetchSeedLots(), fetchFoundationSummary()]);
  return { planned: batches.filter((b) => b.status === "direncanakan"), lots, setup };
}

/** Sales' side of the day. Empty until pf-sales.sql is installed; other failures surface. */
async function fetchSalesWork() {
  try {
    const [orders, invoices, lots] = await Promise.all([fetchOrders(), fetchInvoices(), fetchAvailableLots()]);
    return { orders, invoices, lots };
  } catch (e) {
    const error = toErpError(e);
    if (error.notInstalled) return { orders: [], invoices: [], lots: [] };
    throw error;
  }
}

const LOT_AGING_DAYS = 2;

/** What is overdue: open work orders, and plans past due that nobody has opened yet. */
async function fetchMaintenanceDue(today: string) {
  try {
    const [plans, orders] = await Promise.all([fetchPlans(), fetchWorkOrders()]);
    return [
      ...orders.filter((o) => o.status === "terbuka" && o.due_on <= today).map((o) => ({ id: o.id, title: o.title, due: o.due_on })),
      ...plans.filter((p) => p.active && !p.open_order_id && p.next_due < today).map((p) => ({ id: p.id, title: p.title, due: p.next_due })),
    ];
  } catch (e) {
    const error = toErpError(e);
    if (error.notInstalled) return [];
    throw error;
  }
}

/** People's side of the day, for coordinators. Contracts only where the reader may see them. */
async function fetchPeopleWork(withContracts: boolean) {
  const empty = { shifts: [], attendance: [], leaves: [], contracts: [], people: [] };
  try {
    const [shifts, attendance, leaves, contracts, people] = await Promise.all([fetchShifts(), fetchAttendance(), fetchLeaves(), withContracts ? fetchAllContracts() : Promise.resolve([]), fetchPeople()]);
    return { shifts, attendance, leaves, contracts, people };
  } catch (e) {
    const error = toErpError(e);
    if (error.notInstalled) return empty;
    throw error;
  }
}

/** The shelf's side of the day, for those who look after it. */
async function fetchStockWork() {
  try {
    const [items, shortages, purchases, lots] = await Promise.all([fetchItems(), fetchOpenShortages(), fetchPurchaseOrders(), fetchStockLots()]);
    return { items, shortages, purchases, lots: lots.filter((l) => l.category !== "benih") };
  } catch (e) {
    const error = toErpError(e);
    if (error.notInstalled) return { items: [], shortages: [], purchases: [], lots: [] };
    throw error;
  }
}

/* ------------------------------------------------------------------- the queue */

const TONE: Record<WorkTone, string> = {
  urgent: "bg-[#FDECEA] text-[#B3362C]",
  due: "bg-[#E3F4F4] text-[#0B6477]",
  setup: "bg-[#EEF3F4] text-[#4F6B73]",
  later: "bg-[#EEF3F4] text-[#4F6B73]",
};

function WorkAction({ link, label, className }: { link: WorkLink; label: string; className: string }) {
  if ("id" in link) return <Link to={link.to} params={{ id: link.id }} className={className}>{label}</Link>;
  return <Link to={link.to} className={className}>{label}</Link>;
}

// On a phone the tag and the action share the first line, so a row stays two lines of text under one of controls.
function WorkRow({ item, canAct, phoneHidden }: { item: WorkItem; canAct: boolean; phoneHidden: boolean }) {
  return (
    <li className={`${phoneHidden ? "hidden sm:flex" : "flex"} flex-wrap items-center gap-x-3 border-t border-[#EDF2F2] px-4 pb-2.5 sm:flex-nowrap sm:pt-2.5`}>
      <span className={`w-[104px] shrink-0 rounded-md px-2 py-0.5 text-center text-[12.5px] font-medium ${TONE[item.tone]}`}>{item.tag}</span>
      <span className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-0">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{item.title}</span>
        <span className="block truncate text-[13px] text-[#4F6B73]">{item.detail}</span>
      </span>
      <WorkAction
        link={item.link}
        label={canAct ? item.action : "Lihat"}
        className="ml-auto inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-0"
      />
    </li>
  );
}

function WorkPlaceholder() {
  return (
    <ul aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 border-t border-[#EDF2F2] px-4 py-2.5">
          <span className="h-[22px] w-[104px] shrink-0 rounded-md bg-[#EEF3F4]" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="block h-[14px] w-1/2 rounded bg-[#EEF3F4]" />
            <span className="block h-[12px] w-1/3 rounded bg-[#F3F7F7]" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function WorkPanel({ items, known, loading, canAct }: { items: WorkItem[]; known: boolean; loading: boolean; canAct: boolean }) {
  const [all, setAll] = useState(false);
  const slow = useSlow(loading);
  const shown = all ? items : items.slice(0, WORK_SHOWN);
  return (
    <section className={`${panel} flex min-w-0 flex-col`} aria-labelledby="work-title">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 id="work-title" className={sectionTitle}>
          Perlu tindakan{known && <span className="ml-1.5 tabular-nums text-[#4F6B73]">{items.length}</span>}
        </h2>
        {loading && <span role="status" className="text-[13px] text-[#4F6B73]">{slow ? SLOW_TEXT : "Memuat..."}</span>}
      </div>
      {!known ? (
        loading ? <WorkPlaceholder /> : <p className="border-t border-[#EDF2F2] px-4 py-6 text-center text-[14px] text-[#4F6B73]">Daftar pekerjaan belum bisa ditampilkan.</p>
      ) : items.length === 0 ? (
        <p className="border-t border-[#EDF2F2] px-4 py-6 text-center text-[14px] text-[#4F6B73]">
          Tidak ada pekerjaan tertunda.
        </p>
      ) : (
        <ul>{shown.map((item, i) => <WorkRow key={item.key} item={item} canAct={canAct} phoneHidden={!all && i >= WORK_SHOWN_ON_PHONE} />)}</ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 text-[14px] font-medium text-[#0B6477]">
        {items.length > WORK_SHOWN_ON_PHONE ? (
          <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className={`${items.length > WORK_SHOWN ? "" : "sm:invisible"} min-h-[44px] text-left hover:underline`}>
            {all ? "Tampilkan lebih sedikit" : `Lihat semua (${items.length})`}
          </button>
        ) : <span />}
        <Link to="/erp/batch" className="inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap hover:underline">Semua batch <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- the facilities */

const dash = "-";

function TierCell({ code, holes, known }: { code: string; holes: Hole[]; known: boolean }) {
  const counts = new Map<HoleState, number>();
  for (const h of holes) counts.set(h.state, (counts.get(h.state) ?? 0) + 1);
  const planted = holes.filter((h) => isPlanted(h.state));
  const batch = planted.find((h) => h.batch)?.batch;
  const label = !known ? dash : (batch ?? (counts.get("sanitasi") ? "Sanitasi" : "Kosong"));
  const target = holes[0];
  return (
    <Link
      to="/erp/plant-factory"
      search={target ? { hole: target.id } : {}}
      className="block rounded-lg border border-[#E3ECED] px-2.5 py-2 hover:border-[#14919B]"
      aria-label={known ? `${code}: ${label}, ${planted.length} dari ${holes.length} lubang terisi` : code}
    >
      <span className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="font-medium text-[#0F2F36]">{code}</span>
        <span className={batch ? "font-medium text-[#0F2F36]" : "text-[#4F6B73]"}>{label}</span>
      </span>
      <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#EEF3F4]" aria-hidden="true">
        {HOLE_STATE_KEYS.filter((s) => s !== "kosong").map((s) => (
          <span key={s} style={{ width: `${((counts.get(s) ?? 0) / Math.max(holes.length, 1)) * 100}%`, background: stateColor(s) }} />
        ))}
      </span>
      <span className="mt-1 block text-[12px] tabular-nums text-[#4F6B73]">{known ? planted.length : dash} dari {holes.length}</span>
    </Link>
  );
}

function TrayMark({ slot }: { slot: Slot }) {
  const empty = slot.state === "kosong";
  return (
    <span
      title={empty ? `${slot.id}: kosong` : `${slot.id}: ${slot.batch ?? ""}, ${SLOT_STATES[slot.state].label}`}
      className={`h-[22px] flex-1 rounded-[3px] ${empty ? "border border-[#DCE7E8] bg-white" : ""}`}
      style={empty ? undefined : { background: slotColor(slot.state) }}
    />
  );
}

function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#4F6B73]">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: i.color }} />{i.label}</li>
      ))}
    </ul>
  );
}

/** Temperature and humidity at a place, from its sensors. Says nothing where none report. */
function Conditions({ store, place }: { store: ErpStore; place: string }) {
  const latest = store.monitoring?.latest ?? [];
  const parts = ["suhu", "rh"].map((m) => latestAt(latest, place, m)).filter((r) => r !== null);
  return (
    <Link to="/erp/monitoring" className="mb-2.5 flex min-h-[44px] items-center text-[13px] sm:block sm:min-h-0 text-[#4F6B73] hover:text-[#0B6477]">
      {parts.length ? parts.map((r) => formatWithUnit(r.metric, r.value)).join(" · ") : "Sensor belum tersambung"}
    </Link>
  );
}

function FacilityHead({ title, to, value, unit }: { title: string; to: "/erp/plant-factory" | "/erp/persemaian"; value: string; unit: string }) {
  return (
    <div className="mb-1 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-[13px] font-medium text-[#4F6B73]">{title}</h3>
        <p className="tabular-nums text-[#0F2F36]"><span className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{value}</span> <span className="text-[13px] text-[#4F6B73]">{unit}</span></p>
      </div>
      <Link to={to} className="inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap text-[13px] font-medium text-[#0B6477] hover:underline sm:min-h-0">
        Buka 3D <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function FacilityPanel({ store }: { store: ErpStore }) {
  const shown = (v: number) => (store.hasData ? `${v}` : dash);
  const holes = [...store.pf.holes.values()];
  const filled = holes.filter((h) => isPlanted(h.state)).length;
  const slots = [...store.chamber.slots.values()];
  const trays = slots.filter((s) => s.state !== "kosong").length;
  const holeStates = HOLE_STATE_KEYS.filter((s) => s !== "kosong" && holes.some((h) => h.state === s));
  const trayStates = SLOT_STATE_KEYS.filter((s) => s !== "kosong" && slots.some((t) => t.state === s));

  return (
    <section className={`${panel} min-w-0`} aria-labelledby="facility-title">
      <h2 id="facility-title" className={`${sectionTitle} px-4 pt-3`}>Isi fasilitas</h2>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="min-w-0 px-4 pb-3 pt-2.5">
          <FacilityHead title="Plant factory · PF01" to="/erp/plant-factory" value={shown(filled)} unit={`dari ${HOLES_TOTAL} lubang · ${store.hasData ? store.freeCapacity() : dash} siap pakai`} />
          <Conditions store={store} place="PF01" />
          <div className="grid grid-cols-2 gap-2">
            {TIER_NUMBERS.flatMap((tier) =>
              RACK_NUMBERS.map((rack) => (
                <TierCell key={`${rack}-${tier}`} code={`R${rack}-T${tier}`} holes={store.pf.holesOfRack(rack).filter((h) => h.tier === tier)} known={store.hasData} />
              )),
            )}
          </div>
          <Legend items={holeStates.map((s) => ({ key: s, label: HOLE_STATES[s].label, color: stateColor(s) }))} />
        </div>

        <div className="min-w-0 border-t border-[#EDF2F2] px-4 pb-3 pt-2.5 md:border-l md:border-t-0">
          <FacilityHead title="Persemaian · CH1" to="/erp/persemaian" value={shown(trays)} unit={`dari ${slots.length} nampan`} />
          <Conditions store={store} place="CH1" />
          <div className="space-y-2">
            {SHELVES.map((shelf) => (
              <div key={shelf.shelf} className="flex items-center gap-2">
                <span className="w-[40px] shrink-0 text-[12px] text-[#4F6B73]">Rak {shelf.shelf}</span>
                {/* Rak 4 is shorter than the rest, and stays shorter here: two empty cells keep the columns in line. */}
                <div className="grid flex-1 grid-cols-6 gap-1">
                  {slots.filter((s) => s.shelf === shelf.shelf).map((s) => <span key={s.id} className="flex"><TrayMark slot={s} /></span>)}
                </div>
              </div>
            ))}
          </div>
          <Legend items={trayStates.map((s) => ({ key: s, label: SLOT_STATES[s].label, color: slotColor(s) }))} />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- the calendar */

const CHAMBER_BAR = "#80ED99";
const FACTORY_BAR = "#14919B";
const OVERDUE_BAR = "#E0A526";
const MAX_WEEK_LABELS = 12;

function SchedulePanel({ store }: { store: ErpStore }) {
  const today = store.today;
  const batches = [...store.batches.values()].filter((b) => b.sownAt).sort((a, b) => addDays(a.sownAt, a.cycle).localeCompare(addDays(b.sownAt, b.cycle)));
  const w = scheduleWindow(batches, today);
  const left = (date: string) => `${positionOf(date, w)}%`;
  const span = (from: string, to: string) => ({ left: left(from), width: `${positionOf(to, w) - positionOf(from, w)}%` });
  const anyOverdue = batches.some((b) => scheduleBar(b, today).overdueTo);
  const ticks = weekTicks(w);
  const tickStep = Math.ceil(ticks.length / MAX_WEEK_LABELS);
  const labelledTicks = ticks.filter((_, i) => i % tickStep === 0);

  return (
    <section className={panel} aria-labelledby="schedule-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <h2 id="schedule-title" className={sectionTitle}>Jadwal batch</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#4F6B73]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: CHAMBER_BAR }} />Persemaian</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: FACTORY_BAR }} />Plant factory</span>
          {anyOverdue && <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: OVERDUE_BAR }} />Lewat target</span>}
          <span>Warna pudar: rencana</span>
        </div>
      </div>

      {batches.length === 0 ? (
        <p className="border-t border-[#EDF2F2] px-4 py-6 text-center text-[14px] text-[#4F6B73]">{store.mode === "loading" ? "Memuat data..." : store.hasData ? "Belum ada batch berjalan." : "Jadwal belum bisa ditampilkan."}</p>
      ) : (
        <>
          <div className="hidden border-t border-[#EDF2F2] px-4 pt-2 text-[12px] text-[#4F6B73] md:grid md:grid-cols-[230px_minmax(0,1fr)_84px] md:gap-3">
            <span>Batch</span>
            <div className="relative h-4" aria-hidden="true">
              {labelledTicks.map((d, i) => <span key={d} className={`absolute -translate-x-1/2 whitespace-nowrap tabular-nums ${i % 2 ? "hidden lg:inline" : ""}`} style={{ left: left(d) }}>{formatShortDate(d)}</span>)}
            </div>
            <span className="text-right">Panen</span>
          </div>
          <ul className="px-4 pb-2 pt-1">
            {batches.map((b) => {
              const bar = scheduleBar(b, today);
              const stage = batchStage({ status: "berjalan", sown_at: b.sownAt, cycle_days: b.cycle, plants_now: store.holesOfBatch(b.code).length, trays_now: store.traysOfBatch(b.code).length }, today);
              const row = (
                <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 md:grid-cols-[230px_minmax(0,1fr)_84px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{b.code} <span className="font-normal text-[#36525A]">{b.crop}</span></span>
                    <span className="block truncate text-[12.5px] text-[#4F6B73]">{stage}</span>
                  </span>
                  <span className="relative col-span-2 row-start-2 block h-3 rounded-sm bg-[#F3F7F7] md:col-span-1 md:col-start-2 md:row-start-1" aria-hidden="true">
                    <span className="absolute inset-y-0 rounded-l-sm" style={{ ...span(bar.start, bar.moveOn), background: CHAMBER_BAR }} />
                    <span className="absolute inset-y-0 rounded-r-sm" style={{ ...span(bar.moveOn, bar.end), background: FACTORY_BAR }} />
                    {today < bar.end && <span className="absolute inset-y-0 bg-white/60" style={span(today > bar.start ? today : bar.start, bar.end)} />}
                    {bar.overdueTo && <span className="absolute inset-y-0" style={{ ...span(bar.end, bar.overdueTo), background: OVERDUE_BAR }} />}
                    <span className="absolute -inset-y-1.5 w-px bg-[#0B6477]" style={{ left: left(today) }} />
                  </span>
                  <span className="col-start-2 row-start-1 text-right text-[13px] tabular-nums text-[#0F2F36] md:col-start-3">{formatShortDate(bar.end)}</span>
                </span>
              );
              return (
                <li key={b.code} className="border-t border-[#EDF2F2] first:border-t-0">
                  {b.id ? <Link to="/erp/batch/$id" params={{ id: b.id }} className="block rounded hover:bg-[#F6F8F8]">{row}</Link> : row}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-[#EDF2F2] px-4 py-2 text-[12px] text-[#4F6B73]">Garis tegak: hari ini, {formatShortDate(today)}</p>
        </>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------- the page */

export default function ErpDashboard() {
  const store = useErpStore();
  const records = useLoad(fetchRecords);
  const { canOperate, canReadSales, canManageProduction, canReadPeople, canReadPrivate, canReadMaintenance } = useErpAccess();
  const maintenance = useLoad(async () => (canReadMaintenance ? fetchMaintenanceDue(jakartaToday()) : []), [canReadMaintenance]);
  const team = useLoad(async () => (canReadPeople ? fetchPeopleWork(canReadPrivate) : { shifts: [], attendance: [], leaves: [], contracts: [], people: [] }), [canReadPeople, canReadPrivate]);
  const stock = useLoad(async () => (canManageProduction ? fetchStockWork() : { items: [], shortages: [], purchases: [], lots: [] }), [canManageProduction]);
  const sales = useLoad(async () => (canReadSales ? fetchSalesWork() : { orders: [], invoices: [], lots: [] }), [canReadSales]);
  const large = useLargeScreen();
  const [refreshing, setRefreshing] = useState(false);

  // The queue is only as true as what it read. A table that is not installed yet is not a failure.
  const recordsMissing = !!records.error?.notInstalled;
  const recordsFailed = !!records.error && !recordsMissing;
  const known = store.hasData && (records.data !== null || recordsMissing);
  const loading = store.mode === "loading" || records.loading;

  const rosterToday = team.data ? buildRoster(store.today, store.today, new Date(), team.data.shifts, team.data.attendance, team.data.leaves) : [];
  const items = known
    ? buildWork({
        maintenanceDue: maintenance.data ?? [],
        absentToday: rosterToday.filter((r) => r.state === "tidak_hadir").map((r) => ({ id: r.key, name: r.name, start: clockText(r.shift!.start_at) })),
        flaggedAttendance: team.data?.attendance.filter((a) => a.work_date === store.today && a.source === "ponsel" && attendanceFlags(a).length > 0).map((a) => ({ id: a.id, name: a.full_name, flag: attendanceFlags(a)[0] })),
        leavePending: team.data?.leaves.filter((l) => l.status === "diajukan").map((l) => ({ id: l.id, name: l.full_name, label: l.type, from: l.start_date })),
        contractsEnding: team.data?.contracts.filter((c) => contractEndingSoon(c, store.today)).map((c) => ({ id: c.id, name: team.data!.people.find((p) => p.id === c.person_id)?.full_name ?? "seseorang", until: c.end_date! })),
        today: store.today,
        batches: batchWork(store),
        freeHoles: store.freeCapacity(),
        sanitation: store.mode === "sample" ? [] : store.tiersInSanitation(),
        planned: records.data?.planned.map((b) => ({ id: b.id, code: b.code, crop: batchLabel(b) })) ?? null,
        lots: records.data ? [...records.data.lots, ...(stock.data?.lots.map((l) => ({ id: l.id, lot_no: l.lot_no, qty_on_hand: l.qty_on_hand, unit: l.unit as never, expiry_date: l.expiry_date, itemName: l.item_name })) ?? [])] : null,
        lowStock: stock.data?.items.filter((i) => i.active && i.below_reorder).map((i) => ({ id: i.id, name: i.name, left: formatQty(i.usable_qty, i.unit), minimum: formatQty(i.reorder_point ?? 0, i.unit) })),
        shortages: stock.data?.shortages.map((x) => ({ id: x.id, name: x.item_name, short: formatQty(x.qty_short, x.unit), batch: x.batch_code })),
        purchasesLate: stock.data?.purchases.filter((p) => p.status === "dipesan" && p.open_lines > 0 && p.expected_on && p.expected_on < store.today).map((p) => ({ id: p.id, no: p.po_no, supplier: p.supplier_name, expected: p.expected_on! })),
        setup: records.data?.setup ?? null,
        alarms: store.monitoring?.alarms.map((a) => ({ id: a.id, level: a.level, label: metricInfo(a.metric).label, value: formatWithUnit(a.metric, a.value), place: a.location_code, since: formatDateTime(a.opened_at) })),
        silentDevices: store.monitoring?.assets.filter((a) => a.link_state === "terlambat").map((a) => ({ id: a.id, code: a.code, since: a.last_seen_at ? ago(a.last_seen_at) : "tidak diketahui" })),
        calibrationsDue: store.monitoring?.assets.filter((a) => a.status === "aktif" && a.next_due && a.next_due < store.today).map((a) => ({ id: a.id, code: a.code, due: a.next_due! })),
        ordersDue: sales.data?.orders.filter((o) => o.status === "dikonfirmasi" && o.requested_on && o.requested_on <= store.today && o.delivered_kg < o.ordered_kg).map((o) => ({ id: o.id, no: o.so_no, customer: o.partner_name, requested: o.requested_on!, openKg: formatKg(roundKg(o.ordered_kg - o.delivered_kg)) })),
        invoicesOverdue: sales.data?.invoices.filter((i) => i.status === "terbit" && i.balance > 0 && i.due_on < store.today).map((i) => ({ id: i.id, no: i.invoice_no, customer: i.partner_name, due: i.due_on, balance: formatRupiah(i.balance) })),
        lotsAging: sales.data?.lots.filter((l) => l.best_before && l.best_before >= store.today && l.best_before <= addCalendarDays(store.today, LOT_AGING_DAYS)).map((l) => ({ id: l.id, code: l.lot_code, label: cropLabel({ name: l.crop_name, variety: l.crop_variety }), kg: formatKg(l.remaining_kg), until: l.best_before! })),
      })
    : [];

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([store.load(), records.reload(), sales.reload(), stock.reload(), team.reload(), maintenance.reload()]);
    setRefreshing(false);
  };

  const failure = store.mode === "error" ? store.loadError : recordsFailed ? records.error!.message : sales.error?.message ?? stock.error?.message ?? team.error?.message ?? maintenance.error?.message ?? null;
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${store.today}T00:00:00Z`));

  return (
    <ErpPage
      eyebrow={store.hasData ? dateLabel : "Dashboard"}
      title="Ringkasan"
      sub={known ? workSummary(items) : undefined}
      actions={
        store.hasData ? (
          <div className="flex items-center gap-2 text-[13px] tabular-nums text-[#4F6B73]">
            {store.mode === "sample" ? (
              <span className="rounded-md bg-[#FFF6E5] px-2 py-1 font-medium text-[#8A5A07]">Data contoh</span>
            ) : store.loadedAt ? (
              <span>Data pukul {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(store.loadedAt)}</span>
            ) : null}
            <button type="button" disabled={refreshing} onClick={() => void refresh()} aria-label="Muat ulang data" className="grid h-11 w-11 place-items-center rounded-lg text-[#36525A] hover:bg-white disabled:opacity-50 sm:h-8 sm:w-8">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {failure && <ErrorNote message={`${failure}${store.hasData ? " Angka di bawah dari pemuatan terakhir." : ""}`} onRetry={refresh} />}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <WorkPanel items={items} known={known} loading={loading && !known} canAct={canOperate} />
          {large && <FacilityViewer store={store} />}
        </div>
        <FacilityPanel store={store} />
        <SchedulePanel store={store} />
      </div>
    </ErpPage>
  );
}
