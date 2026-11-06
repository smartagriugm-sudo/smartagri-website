import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ChamberObjectRecord, ChamberOptionsState, ChamberSelection, ChamberViewName } from "plant-factory-3d";
import { ArrowRight, CircleAlert, Home, Minus, MoveRight, Plus, Search } from "lucide-react";
import { display } from "../../lib/fonts";
import {
  CHAMBER_CODE,
  CHAMBER_LAMPS,
  CHAMBER_LIMITS,
  SHELVES,
  SLOT_STATES,
  SLOT_STATE_KEYS,
  slotColor,
} from "../../lib/pf/chamber";
import { FACILITY_CODE } from "../../lib/pf/facility";
import type { ErpStore } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import SeedChamberScene, { type ChamberEngine } from "./SeedChamberScene";
import { formatLongDate } from "../../lib/pf/dashboard";
import { Bar, Card, Kpi, Lifecycle, Note, PanelHeader, Rows, SceneStatus, Segmented, dolly, useEngineActivity, useSceneGate } from "./ui";

// The germination screen: the 3D growth chamber, what its sensors and lamps report
// (the ERP only monitors, it sends no commands), what each tray holds, and the
// queue of seedlings ready to leave for the plant factory. It shows the records;
// they are written on the batch page. The same frame as the plant factory screen.

const VIEWS: { key: ChamberViewName; label: string }[] = [
  { key: "overview", label: "Keseluruhan" },
  { key: "inside", label: "Depan" },
];

const field = "w-full rounded-lg border border-[#DCE7E8] bg-white px-3 py-2 text-[13.5px] text-[#0F2F36] outline-none focus:border-[#14919B] disabled:bg-[#F3F7F7] disabled:text-[#4F6B73]";
const primary = "w-full rounded-lg bg-[#45DFB1] px-3 py-2 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-50";

const percent = (x: number) => `${Math.round(x * 100)}%`;
const lux = (n: number) => Math.round(n).toLocaleString("id-ID");

/* ------------------------------------------------------------ monitoring */

function ClimateReadout({ store }: { store: ErpStore }) {
  const { climate, reference } = store.chamber;
  const rows: [string, string, string][] = [
    ["Suhu", `${climate.temp.toFixed(1)} °C`, `${reference.temp} °C`],
    ["Kelembapan", `${climate.rh.toFixed(0)}% RH`, `${reference.rh}%`],
    ["VPD", `${store.chamber.vpd().toFixed(2)} kPa`, `${store.chamber.referenceVpd().toFixed(2)} kPa`],
    ["CO2", `${Math.round(climate.co2)} ppm`, `${reference.co2} ppm`],
    ["Pencahayaan", `${lux(climate.lux)} lux`, `${lux(store.chamber.referenceLux())} lux`],
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-[#4F6B73]">Iklim di dalam chamber (contoh)</p>
        <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${store.chamber.climateSettled() ? "bg-[#E3F7F0] text-[#0E7A5C]" : "bg-[#FFF6E5] text-[#8A5A07]"}`}>
          {store.chamber.climateSettled() ? "Sesuai acuan" : "Di luar acuan"}
        </span>
      </div>
      {rows.map(([k, v, t]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 rounded-lg bg-[#F3F7F7] px-3 py-2">
          <span className="text-[13px] text-[#4F6B73]">{k}</span>
          <span className="text-right">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F2F36]">{v}</span>
            <span className="ml-2 text-[12px] text-[#4F6B73]">acuan {t}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function LampStatus({ store }: { store: ErpStore }) {
  return (
    <div className="space-y-1.5">
      <p className="mb-2 text-[13px] font-medium text-[#4F6B73]">Lampu (contoh)</p>
      {CHAMBER_LAMPS.map((l) => {
        const on = !!store.chamber.lamps.get(l.id);
        return (
          <div key={l.id} className="flex items-center justify-between text-[13.5px]">
            <span className="text-[#0F2F36]">Di atas rak {l.shelf}</span>
            <span className={`flex items-center gap-1.5 text-[13px] font-medium ${on ? "text-[#0E7A5C]" : "text-[#4F6B73]"}`}>
              <span className={`h-2 w-2 rounded-full ${on ? "bg-[#0E9F6E]" : "bg-[#C9D6D8]"}`} />
              {on ? "Menyala" : "Mati"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ transplant */

function TransplantQueue({ store }: { store: ErpStore }) {
  const queue = store.readyToMove();
  const free = store.freeCapacity();
  return (
    <Card className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>Antrean pindah tanam</p>
        <Link to="/erp/plant-factory" className="text-[12.5px] font-medium text-[#0B6477] hover:underline">{FACILITY_CODE}: {free} lubang siap terima</Link>
      </div>
      {queue.length === 0 ? (
        <p className="text-[13px] text-[#4F6B73]">Belum ada nampan berstatus siap pindah tanam.</p>
      ) : (
        <ul className="space-y-2">
          {queue.map(({ batch, trays, seedlings }) => (
            <li key={batch.code} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-[#0F2F36]">{batch.code} · {batch.crop}</p>
                <p className="text-[12.5px] text-[#4F6B73]">{seedlings} bibit · {trays.length} nampan · hari {batch.age}</p>
              </div>
              {batch.id && (
                <Link to="/erp/batch/$id" params={{ id: batch.id }} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#45DFB1] px-3 py-1.5 text-[13px] font-medium text-[#0B2A22] hover:bg-[#80ED99]">
                  Pindah tanam <MoveRight className="h-4 w-4" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- detail panels */

function SlotPanel({ id, store }: { id: string; store: ErpStore }) {
  const slot = store.chamber.getSlot(id)!;
  const record = store.batch(slot.batch);
  const stats = slot.batch ? store.germinationOf(slot.batch) : null;
  const firstHole = slot.batch ? store.holesOfBatch(slot.batch)[0] : undefined;

  return (
    <div className="space-y-4">
      <PanelHeader eyebrow="Posisi nampan" title={id} sub={`Rak ${slot.shelf} · Posisi ${slot.position} · Baris ${slot.row}, kolom ${slot.column}`} />
      {record && stats ? (
        <div className="space-y-2">
          <Rows
            rows={[
              ["Status", SLOT_STATES[slot.state].label],
              ["Batch", record.code],
              ["Tanaman", slot.crop],
              ["Umur semai", `${store.ageOn(slot.sownOn)} hari`],
              ["Jumlah benih", `${slot.seedCount}`],
              ["Berkecambah", `${slot.germinated + slot.moved}`],
              ["Daya kecambah nampan", `${slot.seedCount ? percent((slot.germinated + slot.moved) / slot.seedCount) : "0%"}`],
              ["Daya kecambah batch", percent(stats.rate)],
              ["Rencana pindah tanam", formatLongDate(slot.transplantOn)],
              ...(slot.moved ? ([["Sudah dipindah", `${slot.moved} bibit`]] as [string, string][]) : []),
            ]}
          />
          <Bar value={slot.germinated + slot.moved} max={slot.seedCount || 1} color="#2F9E57" />
          {slot.note && <Note>{slot.note}</Note>}
        </div>
      ) : (
        <Note>{slot.offline ? "Posisi ini sedang tidak dipakai." : "Posisi ini kosong."}</Note>
      )}
      {record?.id && (
        <Link to="/erp/batch/$id" params={{ id: record.id }} className={`${primary} flex items-center justify-center gap-2`}>
          Catat di halaman batch <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      {!record && !slot.offline && store.mode === "live" && (
        <Link to="/erp/batch" className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
          Semai dari halaman batch <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {firstHole && (
        <Link to="/erp/plant-factory" search={{ hole: firstHole.id }} className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
          Sebagian batch ini sudah di plant factory <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function ChamberPanel({ store, onShelf }: { store: ErpStore; onShelf: (shelf: number) => void }) {
  const counts = store.countSlots();
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`Growth chamber · ${CHAMBER_CODE}`} title="FAITHFUL FPG450" sub="Tempat semai dan germinasi sebelum masuk plant factory" />
      <ClimateReadout store={store} />
      <div className="border-t border-[#E3ECED] pt-4"><LampStatus store={store} /></div>
      <div className="border-t border-[#E3ECED] pt-4">
        <p className="mb-2 text-[13px] font-medium text-[#4F6B73]">Ringkasan semai</p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full">
          {SLOT_STATE_KEYS.map((s) => <div key={s} style={{ width: `${(counts[s] / store.chamber.slots.size) * 100}%`, background: slotColor(s) }} />)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {SLOT_STATE_KEYS.map((s) => (
            <div key={s} className="flex items-center justify-between gap-1 text-[12.5px]">
              <span className="flex items-center gap-1.5 text-[#4F6B73]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slotColor(s) }} />{SLOT_STATES[s].label}</span>
              <span className="font-medium text-[#0F2F36]">{counts[s]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {SHELVES.map((s) => {
            const trays = [...store.chamber.slots.values()].filter((x) => x.shelf === s.shelf);
            const batch = store.batch(trays.find((x) => x.batch)?.batch);
            return (
              <button key={s.shelf} type="button" onClick={() => onShelf(s.shelf)} className="block w-full rounded-lg border border-[#E3ECED] px-3 py-2 text-left hover:border-[#14919B]">
                <span className="flex justify-between text-[13px]"><span className="font-medium text-[#0F2F36]">{s.label}</span><span className="text-[#4F6B73]">{trays.filter((x) => x.state !== "kosong").length}/{trays.length}</span></span>
                <span className="block text-[12.5px] text-[#4F6B73]">{batch ? `${batch.code} · ${batch.crop} · hari ${batch.age}` : "Tidak ada nampan"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-[#E3ECED] pt-4">
        <p className="mb-2 text-[13px] font-medium text-[#4F6B73]">Batas alat menurut brosur</p>
        <Rows
          rows={[
            ["Suhu, lampu menyala", `${CHAMBER_LIMITS.tempLampOn.join("–")} °C`],
            ["Suhu, lampu mati", `${CHAMBER_LIMITS.tempLampOff.join("–")} °C`],
            ["Kelembapan", `${CHAMBER_LIMITS.humidity.join("–")} % RH`],
            ["Pencahayaan", `${CHAMBER_LIMITS.lux[0]}–${lux(CHAMBER_LIMITS.lux[1])} lux`],
            ["Beban per rak", `${CHAMBER_LIMITS.loadPerShelfKg} kg`],
          ]}
        />
      </div>
    </div>
  );
}

function ObjectPanel({ object: o, store }: { object: ChamberObjectRecord; store: ErpStore }) {
  const title = o.type === "lamp" ? `Papan LED di atas rak ${o.lights_shelf}` : o.type === "sensor_climate" ? "Sensor mikroklimat" : "Growth chamber";
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={o.id} title={title} />
      {o.assumed && (
        <Note tone="warn">
          <CircleAlert className="mr-1 inline h-3.5 w-3.5" />
          Letak dan jenis objek ini diperkirakan dari foto, belum dikonfirmasi.
        </Note>
      )}
      {o.type === "lamp" ? (
        <Rows rows={[["Status", store.chamber.lamps.get(o.id) ? "Menyala" : "Mati"]]} />
      ) : (
        <ClimateReadout store={store} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- page */

type Props = { active: boolean; preload: boolean; onSceneReady: () => void; focusSlot?: string };

export default function SeedChamberPage({ active, preload, onSceneReady, focusSlot }: Props) {
  const store = useErpStore();
  const sceneOn = useSceneGate(active || preload);
  const [engine, setEngine] = useState<ChamberEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [selection, setSelection] = useState<ChamberSelection | null>(null);
  const [shelf, setShelf] = useState(0);
  const [view, setView] = useState<ChamberViewName>("overview");
  const [options, setOptions] = useState<ChamberOptionsState | null>(null);
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState<string | null>(null);

  const onReady = useCallback((e: ChamberEngine) => {
    e.on("filter", (f) => setShelf(f.shelf));
    e.on("view", setView);
    e.on("options", (o) => setOptions({ ...o }));
    setOptions({ ...e.options });
    setEngine(e);
    onSceneReady();
  }, [onSceneReady]);
  const onError = useCallback((e: unknown) => {
    console.error("Model 3D gagal dimuat", e);
    setFailed(true);
  }, []);

  // The simulated climate moves while this screen is open, on the panel and on the model's own screen.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      store.chamber.stepClimate();
      engine?.refresh();
      store.emit();
    }, 2000);
    return () => clearInterval(t);
  }, [store, engine, active]);

  useEngineActivity(engine, active);

  // New records arrive after the model does, and whenever a batch page saves.
  useEffect(() => {
    engine?.refresh();
  }, [engine, store.dataVersion]);

  useEffect(() => {
    if (engine && active && focusSlot) engine.focusSlot(focusSlot);
  }, [engine, active, focusSlot]);

  const selectedObject = selection?.kind === "object" ? engine?.manifest.objects.find((o) => o.id === selection.id) : undefined;
  const selectedSlot = selection?.kind === "slot" ? store.chamber.getSlot(selection.id) : undefined;
  const ready = store.readyToMove();
  const seedlings = ready.reduce((n, r) => n + r.seedlings, 0);
  const counts = store.countSlots();
  const { climate } = store.chamber;

  const inChamber = store.batchesInChamber();
  const focusBatch = store.batch(selectedSlot?.batch) ?? ready[0]?.batch ?? inChamber[0];

  const tool = "grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]";
  const toggle = "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[12.5px] font-medium text-[#36525A] hover:bg-[#EEF5F5]";
  const Check = ({ on }: { on: boolean }) => <span className={`h-3 w-3 rounded-sm border ${on ? "border-[#14919B] bg-[#14919B]" : "border-[#9AAEB2]"}`} />;

  return (
    <main className="relative flex-1 bg-[#E7EAE7] lg:h-screen lg:min-h-[680px]">
      {/* Scene */}
      <div className="relative h-[62vh] min-h-[420px] lg:absolute lg:bottom-[204px] lg:left-0 lg:right-[392px] lg:top-0 lg:h-auto">
        {sceneOn && <SeedChamberScene provider={store.chamber} onReady={onReady} onSelect={setSelection} onError={onError} />}
        {!engine && <SceneStatus failed={failed} />}
        <Card className="absolute right-3 top-3 flex flex-col p-1 lg:top-4">
          <button type="button" className={tool} onClick={() => engine && dolly(engine, 0.8)} aria-label="Perbesar"><Plus className="h-4 w-4" /></button>
          <button type="button" className={tool} onClick={() => engine && dolly(engine, 1.25)} aria-label="Perkecil"><Minus className="h-4 w-4" /></button>
          <button
            type="button"
            className={tool}
            aria-label="Tampilan awal"
            onClick={() => {
              engine?.setFilter({ shelf: 0 });
              engine?.setView("overview");
              engine?.select(null);
            }}
          >
            <Home className="h-4 w-4" />
          </button>
        </Card>
      </div>

      {/* KPI cards */}
      <div className="flex gap-3 overflow-x-auto px-3 py-3 lg:pointer-events-none lg:absolute lg:left-4 lg:right-[460px] lg:top-4 lg:p-0 lg:pb-3">
        <div className="flex gap-3 lg:pointer-events-auto">
          <Kpi label="Bibit siap pindah" value={`${seedlings}`} sub={`${counts.siap_pindah} nampan · ${store.freeCapacity()} lubang siap terima`} />
          <Kpi label="Suhu" value={`${climate.temp.toFixed(1)} °C`} sub={`contoh · acuan ${store.chamber.reference.temp} °C`} />
          <Kpi label="Kelembapan" value={`${climate.rh.toFixed(0)}%`} sub={`contoh · acuan ${store.chamber.reference.rh}% RH`} />
          <Kpi label="Pencahayaan" value={lux(climate.lux)} sub={`contoh · ${store.chamber.lampsOn()}/${CHAMBER_LAMPS.length} lampu`} />
        </div>
      </div>

      {/* View, shelves, doors, legend */}
      <div className="px-3 pb-3 lg:pointer-events-none lg:absolute lg:bottom-[204px] lg:left-4 lg:right-[404px] lg:p-0">
        <Card className="space-y-2 px-3 py-2.5 lg:pointer-events-auto">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Segmented label="Tampilan" value={view} options={VIEWS} onChange={(v) => { engine?.setFilter({ shelf: 0 }); engine?.setView(v); }} />
            <Segmented label="Rak" value={shelf} options={[{ key: 0, label: "Semua" }, ...SHELVES.map((s) => ({ key: s.shelf as number, label: `${s.shelf}` }))]} onChange={(s) => engine?.setFilter({ shelf: s })} />
            <button type="button" className={toggle} aria-pressed={!!options?.outerDoorOpen} onClick={() => engine?.setOptions({ outerDoorOpen: !options?.outerDoorOpen })}><Check on={!!options?.outerDoorOpen} />Pintu besi</button>
            <button type="button" className={toggle} aria-pressed={!!options?.glassDoorOpen} onClick={() => engine?.setOptions({ glassDoorOpen: !options?.glassDoorOpen })}><Check on={!!options?.glassDoorOpen} />Pintu kaca</button>
            <button type="button" className={toggle} aria-pressed={!!options?.statusColors} onClick={() => engine?.setOptions({ statusColors: !options?.statusColors })}><Check on={!!options?.statusColors} />Warna status</button>
            <button type="button" className={toggle} aria-pressed={!!options?.realLight} onClick={() => engine?.setOptions({ realLight: !options?.realLight })}><Check on={!!options?.realLight} />Ruang gelap</button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {SLOT_STATE_KEYS.map((s) => (
              <span key={s} className="flex items-center gap-1 text-[12px] text-[#4F6B73]">
                <span className="h-2 w-2 rounded-full" style={{ background: slotColor(s) }} />
                {SLOT_STATES[s].label}
              </span>
            ))}
            <span className="text-[12px] text-[#4F6B73] lg:ml-auto">Pintu hanya tampilan model, bukan status pintu asli</span>
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      <div className="px-3 pb-3 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:w-[360px] lg:p-0">
        <Card className="h-full overflow-y-auto p-4">
          <form
            className="relative mb-4"
            onSubmit={(e) => {
              e.preventDefault();
              const id = query.trim().toUpperCase();
              setNotFound(engine && id && !engine.focusSlot(id) ? id : null);
            }}
          >
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#4F6B73]" />
            <input aria-label="Cari posisi nampan" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari posisi, contoh CH1-S2-P03" className={`${field} pl-9`} />
            {notFound && <p className="mt-1 text-[12.5px] text-[#B26205]">ID {notFound} tidak ditemukan.</p>}
          </form>
          {selectedSlot ? (
            <SlotPanel id={selectedSlot.id} store={store} />
          ) : selectedObject ? (
            <ObjectPanel object={selectedObject} store={store} />
          ) : (
            <ChamberPanel store={store} onShelf={(s) => engine?.setFilter({ shelf: s })} />
          )}
        </Card>
      </div>

      {/* Lifecycle and the way out to the plant factory */}
      <div className="grid gap-3 px-3 pb-6 lg:absolute lg:bottom-4 lg:left-4 lg:right-[404px] lg:h-[176px] lg:grid-cols-[1.25fr_1fr] lg:p-0">
        {focusBatch && <Lifecycle batch={focusBatch} phase={store.phaseOf(focusBatch)} compact />}
        <TransplantQueue store={store} />
      </div>

    </main>
  );
}
