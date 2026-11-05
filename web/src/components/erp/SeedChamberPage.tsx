import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { ChamberObjectRecord, ChamberOptionsState, ChamberSelection, ChamberViewName } from "plant-factory-3d";
import { ArrowRight, CircleAlert, Droplets, Home, Lightbulb, Minus, MoveRight, Plus, Search, Sprout, Sun, Thermometer, X } from "lucide-react";
import { display } from "../../lib/fonts";
import {
  CHAMBER_CODE,
  CHAMBER_LAMPS,
  CHAMBER_LIMITS,
  SHELVES,
  SLOT_STATES,
  SLOT_STATE_KEYS,
  seedAge,
  slotColor,
  type SlotState,
} from "../../lib/pf/chamber";
import { FACILITY_CODE } from "../../lib/pf/facility";
import type { ErpStore, TransplantResult } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import SeedChamberScene, { type ChamberEngine } from "./SeedChamberScene";
import { Bar, Card, Kpi, Lifecycle, Note, PanelHeader, Rows, SceneStatus, Segmented, dolly, useEngineActivity, useSceneGate } from "./ui";

// The germination screen: the 3D growth chamber, what its sensors and lamps
// report (the ERP only monitors, it sends no commands), a form for each tray, and the queue of seedlings ready to leave for the plant
// factory. The same frame as the plant factory screen, on the same ERP state.

const VIEWS: { key: ChamberViewName; label: string }[] = [
  { key: "overview", label: "Keseluruhan" },
  { key: "inside", label: "Depan" },
];

const field = "w-full rounded-lg border border-[#DCE7E8] bg-white px-3 py-2 text-[13.5px] text-[#0F2F36] outline-none focus:border-[#14919B] disabled:bg-[#F3F7F7] disabled:text-[#6B8289]";
const label = "block text-[13px] font-medium text-[#4F6B73]";
const primary = "w-full rounded-lg bg-[#45DFB1] px-3 py-2 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-lg border border-[#DCE7E8] px-3 py-2 text-[13.5px] font-medium text-[#0F2F36] hover:border-[#14919B] disabled:cursor-not-allowed disabled:opacity-50";

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
        <p className="text-[13px] font-medium text-[#4F6B73]">Iklim di dalam chamber</p>
        <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${store.chamber.climateSettled() ? "bg-[#E3F7F0] text-[#0E7A5C]" : "bg-[#FFF6E5] text-[#8A5A07]"}`}>
          {store.chamber.climateSettled() ? "Sesuai acuan" : "Di luar acuan"}
        </span>
      </div>
      {rows.map(([k, v, t]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 rounded-lg bg-[#F3F7F7] px-3 py-2">
          <span className="text-[13px] text-[#6B8289]">{k}</span>
          <span className="text-right">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F2F36]">{v}</span>
            <span className="ml-2 text-[12px] text-[#6B8289]">acuan {t}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function LampStatus({ store }: { store: ErpStore }) {
  return (
    <div className="space-y-1.5">
      <p className="mb-2 text-[13px] font-medium text-[#4F6B73]">Lampu</p>
      {CHAMBER_LAMPS.map((l) => {
        const on = !!store.chamber.lamps.get(l.id);
        return (
          <div key={l.id} className="flex items-center justify-between text-[13.5px]">
            <span className="text-[#0F2F36]">Di atas rak {l.shelf}</span>
            <span className={`flex items-center gap-1.5 text-[13px] font-medium ${on ? "text-[#0E7A5C]" : "text-[#6B8289]"}`}>
              <span className={`h-2 w-2 rounded-full ${on ? "bg-[#0E9F6E]" : "bg-[#C9D6D8]"}`} />
              {on ? "Menyala" : "Mati"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Dialog({ title, children, onClose, locked = false }: { title: string; children: ReactNode; onClose: () => void; locked?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, locked]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#08313A]/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-full w-full max-w-[440px] space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-[#0F2F36]" style={display}>{title}</h2>
          <button type="button" aria-label="Tutup" disabled={locked} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-[#6B8289] hover:bg-[#EEF5F5]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ transplant */

function TransplantDialog({ store, code, onClose, onMoved }: { store: ErpStore; code: string; onClose: () => void; onMoved: () => void }) {
  const ready = store.readyToMove().find((r) => r.batch.code === code);
  const tiers = store.tiersFor(code);
  const [target, setTarget] = useState(() => {
    const t = tiers.find((x) => !x.blocked);
    return t ? `${t.rack}-${t.tier}` : "";
  });
  const [result, setResult] = useState<TransplantResult | null>(null);

  if (result) {
    return (
      <Dialog title="Pindah tanam tercatat" onClose={onClose}>
        <p className="text-[14px] text-[#0F2F36]">
          {result.count} bibit {result.batch} kini ada di Rak {result.rack} Tingkat {result.tier}, dengan status Bibit.
        </p>
        {result.left > 0 && <Note tone="warn">{result.left} bibit tidak muat dan tetap di chamber, masih menunggu tingkat lain.</Note>}
        <div className="flex justify-end gap-2">
          <button type="button" className={secondary} onClick={onClose}>Tetap di persemaian</button>
          <Link to="/erp" search={{ hole: result.firstHole }} onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-[#45DFB1] px-4 py-2 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99]">
            Lihat di plant factory <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Dialog>
    );
  }
  if (!ready) return null;

  const chosen = tiers.find((t) => `${t.rack}-${t.tier}` === target);
  const count = chosen ? Math.min(chosen.free, ready.seedlings) : 0;
  return (
    <Dialog title={`Pindah tanam ${code}`} onClose={onClose}>
      <p className="text-[13.5px] text-[#4F6B73]">
        {ready.batch.crop} · {ready.seedlings} bibit dari {ready.trays.length} nampan. Pilih tingkat tujuan di {FACILITY_CODE}.
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Tingkat tujuan">
        {tiers.map((t) => {
          const key = `${t.rack}-${t.tier}`;
          return (
            <label key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${t.blocked ? "border-[#E3ECED] bg-[#F3F7F7] text-[#8AA0A5]" : target === key ? "border-[#14919B] bg-[#14919B]/5" : "cursor-pointer border-[#E3ECED] hover:border-[#14919B]"}`}>
              <input type="radio" name="tier" className="accent-[#14919B]" disabled={!!t.blocked} checked={target === key} onChange={() => setTarget(key)} />
              <span>
                <span className={`block font-medium ${t.blocked ? "" : "text-[#0F2F36]"}`}>Rak {t.rack} · Tingkat {t.tier}</span>
                <span className="block text-[12px]">{t.blocked ?? `${t.free} lubang kosong`}</span>
              </span>
            </label>
          );
        })}
      </div>
      {!chosen && <Note tone="warn">Belum ada tingkat yang bisa menerima batch ini.</Note>}
      {chosen && count < ready.seedlings && <Note tone="warn">Tingkat ini memuat {count} bibit. Sisa {ready.seedlings - count} bibit tetap di chamber.</Note>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondary} onClick={onClose}>Batal</button>
        <button
          type="button"
          disabled={!chosen}
          className="rounded-lg bg-[#45DFB1] px-4 py-2 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setResult(store.transplant(code, chosen!.rack, chosen!.tier));
            onMoved();
          }}
        >
          Pindahkan {count} bibit
        </button>
      </div>
    </Dialog>
  );
}

function TransplantQueue({ store, onMove }: { store: ErpStore; onMove: (code: string) => void }) {
  const queue = store.readyToMove();
  const free = store.freeCapacity();
  return (
    <Card className="h-full px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>Antrean pindah tanam</p>
        <Link to="/erp" className="text-[12.5px] font-medium text-[#14919B] hover:underline">{FACILITY_CODE}: {free} lubang siap terima</Link>
      </div>
      {queue.length === 0 ? (
        <p className="text-[13px] text-[#6B8289]">Belum ada nampan berstatus siap pindah tanam.</p>
      ) : (
        <ul className="space-y-2">
          {queue.map(({ batch, trays, seedlings }) => (
            <li key={batch.code} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-[#0F2F36]">{batch.code} · {batch.crop}</p>
                <p className="text-[12.5px] text-[#6B8289]">{seedlings} bibit · {trays.length} nampan · hari {batch.age}</p>
              </div>
              <button type="button" onClick={() => onMove(batch.code)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#45DFB1] px-3 py-1.5 text-[13px] font-medium text-[#0B2A22] hover:bg-[#80ED99]">
                Pindah tanam <MoveRight className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- detail panels */

function SlotPanel({ id, store, onSaved, onMove }: { id: string; store: ErpStore; onSaved: () => void; onMove: (code: string) => void }) {
  const slot = store.chamber.getSlot(id)!;
  const [state, setState] = useState<SlotState>(slot.state);
  const [batch, setBatch] = useState(slot.batch ?? "");
  const [crop, setCrop] = useState(slot.crop);
  const [seedCount, setSeedCount] = useState(String(slot.seedCount));
  const [germinated, setGerminated] = useState(String(slot.germinated));
  const [sownOn, setSownOn] = useState(slot.sownOn);
  const [transplantOn, setTransplantOn] = useState(slot.transplantOn);
  const [note, setNote] = useState(slot.note);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const record = store.batch(slot.batch);
  const stats = slot.batch ? store.germinationOf(slot.batch) : null;
  const firstHole = slot.batch ? store.holesOfBatch(slot.batch)[0] : undefined;
  const empty = state === "kosong";

  return (
    <div className="space-y-4">
      <PanelHeader eyebrow="Posisi nampan" title={id} sub={`Rak ${slot.shelf} · Posisi ${slot.position} · Baris ${slot.row}, kolom ${slot.column}`} />
      {record && stats && (
        <div className="space-y-2">
          <Rows
            rows={[
              ["Umur semai", `${seedAge(slot.sownOn)} hari`],
              ["Daya kecambah nampan", `${slot.seedCount ? percent((slot.germinated + slot.moved) / slot.seedCount) : "0%"}`],
              ["Daya kecambah batch", percent(stats.rate)],
              ...(slot.moved ? ([["Sudah dipindah", `${slot.moved} bibit`]] as [string, string][]) : []),
            ]}
          />
          <Bar value={slot.germinated + slot.moved} max={slot.seedCount || 1} color="#2F9E57" />
        </div>
      )}
      {slot.state === "siap_pindah" && slot.batch && slot.germinated > 0 && (
        <button type="button" className={`${primary} flex items-center justify-center gap-2`} onClick={() => onMove(slot.batch!)}>
          Pindah tanam ke plant factory <MoveRight className="h-4 w-4" />
        </button>
      )}
      {firstHole && (
        <Link to="/erp" search={{ hole: firstHole.id }} className="flex items-center gap-1 text-[13px] font-medium text-[#14919B] hover:underline">
          Sebagian batch ini sudah di plant factory <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      <form
        className="space-y-3 border-t border-[#E3ECED] pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const problem = store.updateSlot(id, { state, batch, crop, sownOn, transplantOn, note, seedCount: Number(seedCount) || 0, germinated: Number(germinated) || 0 });
          setError(problem);
          setSaved(!problem);
          if (!problem) onSaved();
        }}
      >
        <label className={label}>
          Status
          <select value={state} onChange={(e) => setState(e.target.value as SlotState)} className={`${field} mt-1`}>
            {SLOT_STATE_KEYS.map((s) => <option key={s} value={s}>{SLOT_STATES[s].label}</option>)}
          </select>
        </label>
        {!empty && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className={label}>
                Batch
                <input
                  list="erp-batches"
                  value={batch}
                  onChange={(e) => {
                    setBatch(e.target.value);
                    const known = store.batch(e.target.value.trim());
                    if (known) setCrop(known.crop);
                  }}
                  className={`${field} mt-1`}
                />
                <datalist id="erp-batches">{store.batchesInChamber().map((b) => <option key={b.code} value={b.code} />)}</datalist>
              </label>
              <label className={label}>Tanaman<input value={crop} onChange={(e) => setCrop(e.target.value)} className={`${field} mt-1`} /></label>
              <label className={label}>Jumlah benih<input type="number" min="0" value={seedCount} onChange={(e) => setSeedCount(e.target.value)} className={`${field} mt-1`} /></label>
              <label className={label}>Berkecambah<input type="number" min="0" value={germinated} onChange={(e) => setGerminated(e.target.value)} className={`${field} mt-1`} /></label>
            </div>
            <label className={label}>Tanggal semai<input type="date" value={sownOn} onChange={(e) => setSownOn(e.target.value)} className={`${field} mt-1`} /></label>
            <label className={label}>Rencana pindah tanam<input type="date" value={transplantOn} onChange={(e) => setTransplantOn(e.target.value)} className={`${field} mt-1`} /></label>
          </>
        )}
        <label className={label}>Catatan<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${field} mt-1 resize-none`} /></label>
        {error && <Note tone="warn">{error}</Note>}
        {saved && <Note>Tersimpan di sesi ini.</Note>}
        <button type="submit" className={secondary + " w-full"}>Simpan catatan semai</button>
        <p className="text-[12px] text-[#6B8289]">Perubahan hanya berlaku di sesi ini sampai tabel ERP tersambung.</p>
      </form>
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
                <span className="flex justify-between text-[13px]"><span className="font-medium text-[#0F2F36]">{s.label}</span><span className="text-[#6B8289]">{trays.filter((x) => x.state !== "kosong").length}/{trays.length}</span></span>
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
  const [moving, setMoving] = useState<string | null>(null);
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
    <main className="relative flex-1 lg:h-[calc(100vh-64px)] lg:min-h-[680px]">
      {/* Scene */}
      <div className="relative h-[62vh] min-h-[420px] lg:absolute lg:bottom-[172px] lg:left-0 lg:right-[392px] lg:top-0 lg:h-auto">
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
          <Kpi icon={Sprout} label="Bibit siap pindah" value={`${seedlings}`} sub={`${counts.siap_pindah} nampan · ${store.freeCapacity()} lubang siap terima`} />
          <Kpi icon={Thermometer} label="Suhu" value={`${climate.temp.toFixed(1)} °C`} sub={`acuan ${store.chamber.reference.temp} °C`} />
          <Kpi icon={Droplets} label="Kelembapan" value={`${climate.rh.toFixed(0)}%`} sub={`acuan ${store.chamber.reference.rh}% RH`} />
          <Kpi icon={climate.lux > 0 ? Sun : Lightbulb} label="Pencahayaan" value={lux(climate.lux)} sub={`lux · ${store.chamber.lampsOn()}/${CHAMBER_LAMPS.length} lampu`} />
        </div>
      </div>

      {/* View, shelves, doors, legend */}
      <div className="px-3 pb-3 lg:pointer-events-none lg:absolute lg:bottom-[172px] lg:left-4 lg:right-[404px] lg:p-0">
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
            <span className="text-[12px] text-[#6B8289] lg:ml-auto">Pintu hanya tampilan model, bukan status pintu asli</span>
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
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8AA0A5]" />
            <input aria-label="Cari posisi nampan" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari posisi, contoh CH1-S2-P03" className={`${field} pl-9`} />
            {notFound && <p className="mt-1 text-[12.5px] text-[#B26205]">ID {notFound} tidak ditemukan.</p>}
          </form>
          {selectedSlot ? (
            <SlotPanel
              key={`${selectedSlot.id}:${selectedSlot.state}:${selectedSlot.germinated}`}
              id={selectedSlot.id}
              store={store}
              onSaved={() => engine?.refreshSlot(selectedSlot.id)}
              onMove={setMoving}
            />
          ) : selectedObject ? (
            <ObjectPanel object={selectedObject} store={store} />
          ) : (
            <ChamberPanel store={store} onShelf={(s) => engine?.setFilter({ shelf: s })} />
          )}
        </Card>
      </div>

      {/* Lifecycle and the way out to the plant factory */}
      <div className="grid gap-3 px-3 pb-6 lg:absolute lg:bottom-4 lg:left-4 lg:right-[404px] lg:h-[148px] lg:grid-cols-[1.25fr_1fr] lg:p-0">
        {focusBatch && <Lifecycle batch={focusBatch} phase={store.phaseOf(focusBatch)} />}
        <TransplantQueue store={store} onMove={setMoving} />
      </div>

      {moving && <TransplantDialog store={store} code={moving} onClose={() => setMoving(null)} onMoved={() => engine?.refresh()} />}
    </main>
  );
}
