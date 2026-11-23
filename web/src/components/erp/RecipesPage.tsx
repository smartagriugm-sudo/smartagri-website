import { useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  RECIPE_CODE,
  RECIPE_PHASES,
  RECIPE_STATUS,
  recipeStatusLabel,
  activateRecipe,
  createRecipe,
  cropLabel,
  deleteRecipeDraft,
  fetchCrops,
  fetchRecipePhases,
  fetchRecipes,
  groupRecipes,
  newRecipeVersion,
  normalizeRecipeCode,
  parsePhaseForms,
  phaseLabel,
  phaseToForm,
  retireRecipe,
  savePhases,
  totalDays,
  updateRecipeNotes,
  type PfCrop,
  type PfRecipe,
  type PfRecipePhase,
  type PhaseForm,
  type RecipePhaseKey,
} from "../../lib/pf/foundation";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note, Segmented } from "./ui";
import { useLang, useT } from "../../lib/i18n";
import { MATERIAL_BASES, fetchItems, fetchRecipeMaterials, formatQty, parseMaterialRows, saveRecipeMaterials, type MaterialBasis } from "../../lib/pf/inventory";
import { METRICS, fetchRecipeTargets, formatBand, metricInfo, metricLabel, parseTargetRows, saveRecipeTargets, type RecipeTarget, type TargetRow } from "../../lib/pf/monitoring";

// Versioned recipes. Only a draft can be edited: once active, a change means a
// new version, so a batch can always say exactly which recipe it grew under.

function StatusBadge({ status }: { status: PfRecipe["status"] }) {
  const s = RECIPE_STATUS[status];
  const lang = useLang();
  return <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-medium ${s.className}`}>{recipeStatusLabel(status, lang)}</span>;
}

function NewRecipe({ crops, onCreated, onCancel }: { crops: PfCrop[]; onCreated: (id: string) => void; onCancel: () => void }) {
  const usable = crops.filter((c) => c.active);
  const [cropId, setCropId] = useState(usable[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const action = useAction();
  const t = useT();

  const submit = async () => {
    const normalized = normalizeRecipeCode(code);
    if (!cropId) return action.setError(t({ en: "Choose a crop first.", id: "Pilih tanaman dulu." }));
    if (!RECIPE_CODE.test(normalized)) return action.setError(t({ en: "A code can only have letters, numbers and hyphens.", id: "Kode hanya boleh berisi huruf, angka, dan tanda hubung." }));
    let created = "";
    if (await action.run(async () => { created = await createRecipe(cropId, normalized, notes.trim()); })) onCreated(created);
  };

  if (usable.length === 0) return <Note tone="warn">{t({ en: "No active crops yet. Add one first under Crops.", id: "Belum ada tanaman aktif. Tambahkan dulu di menu Tanaman." })}</Note>;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "New recipe", id: "Resep baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Crop", id: "Tanaman" })}>
          <select className={inputClass} value={cropId} onChange={(e) => setCropId(e.target.value)}>
            {usable.map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
          </select>
        </Field>
        <Field label={t({ en: "Recipe code", id: "Kode resep" })} hint={t({ en: "For example RSP-SEL-03. It stays the same between versions.", id: "Misalnya RSP-SEL-03. Kodenya tetap sama antarversi." })}>
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="RSP-SEL-03" />
        </Field>
        <Field label={t({ en: "Notes", id: "Catatan" })}><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{t({ en: "Create draft", id: "Buat draf" })}</PrimaryButton>
          <SecondaryButton onClick={onCancel}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

/** What a batch of this recipe uses up by itself as the floor records its work. Read-only once active. */
function MaterialsSection({ recipe, canEdit }: { recipe: PfRecipe; canEdit: boolean }) {
  const state = useLoad(async () => {
    const [materials, items] = await Promise.all([fetchRecipeMaterials(recipe.id), fetchItems()]);
    return { materials, items };
  }, [recipe.id]);
  const t = useT();
  const lang = useLang();
  if (state.error?.notInstalled) return null;
  return (
    <div className="mt-4 border-t border-[#E3ECED] pt-3">
      <h3 className="mb-1 text-[15px] font-medium text-[#0F2F36]">{t({ en: "Materials used up automatically", id: "Bahan yang terpakai otomatis" })}</h3>
      <p className="mb-2 text-[13px] text-[#4F6B73]">{t({ en: "Stock goes down when an operator records sowing, transplanting or harvest. If stock runs short, the work carries on and the shortage shows on the Stock page.", id: "Stok berkurang saat operator mencatat semai, pindah tanam, atau panen. Jika stok kurang, pekerjaan tetap jalan dan kekurangannya tampil di halaman Stok." })}</p>
      <DataState state={state}>
        {({ materials, items }) => (canEdit && recipe.status === "draft"
          ? <MaterialRows key={recipe.id} recipe={recipe} initial={materials.map((m) => ({ itemId: m.item_id, basis: m.basis, qty: String(m.qty).replace(".", ",") }))} items={items} onSaved={state.reload} />
          : materials.length === 0
            ? <p className="text-[14px] text-[#4F6B73]">{t({ en: "No materials yet.", id: "Belum ada bahan." })}{recipe.status !== "draft" ? t({ en: " Create a new version to add it.", id: " Buat versi baru untuk menambahkannya." }) : ""}</p>
            : (
              <ul className="text-[14px]">
                {materials.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 border-t border-[#EDF2F2] py-2 first:border-0">
                    <span className="text-[#0F2F36]">{m.item_name}</span>
                    <span className="tabular-nums text-[#4F6B73]">{formatQty(m.qty, m.unit, lang)} {(() => { const b = MATERIAL_BASES.find((x) => x.key === m.basis); return (lang === "id" ? b?.labelId : b?.label)?.toLowerCase(); })()}</span>
                  </li>
                ))}
              </ul>
            )
        )}
      </DataState>
    </div>
  );
}

function MaterialRows({ recipe, initial, items, onSaved }: { recipe: PfRecipe; initial: { itemId: string; basis: MaterialBasis; qty: string }[]; items: { id: string; name: string; unit: string; category: string; active: boolean }[]; onSaved: () => Promise<void> }) {
  const usable = items.filter((i) => i.active && i.category !== "benih");
  const [rows, setRows] = useState(initial);
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const change = (i: number, patch: Partial<{ itemId: string; basis: MaterialBasis; qty: string }>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  const save = async () => {
    const parsed = parseMaterialRows(rows, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await saveRecipeMaterials(recipe.id, parsed.rows);
      await onSaved();
    });
  };
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_100px_40px]">
          <select className={`${inputClass} sm:order-none`} aria-label={`${t({ en: "Item", id: "Barang" })} ${i + 1}`} value={r.itemId} onChange={(e) => change(i, { itemId: e.target.value })}>
            {usable.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}
          </select>
          <button type="button" onClick={() => setRows((all) => all.filter((_, n) => n !== i))} aria-label={t({ en: `Remove material ${i + 1}`, id: `Hapus bahan ${i + 1}` })} className="grid h-11 w-10 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#FBEDEC] hover:text-[#D9433B] sm:order-last sm:h-9"><Trash2 className="h-4 w-4" /></button>
          <select className={inputClass} aria-label={t({ en: `Usage basis ${i + 1}`, id: `Dasar pemakaian ${i + 1}` })} value={r.basis} onChange={(e) => change(i, { basis: e.target.value as MaterialBasis })}>
            {MATERIAL_BASES.map((b) => <option key={b.key} value={b.key}>{lang === "id" ? b.labelId : b.label}, {lang === "id" ? b.whenId : b.when}</option>)}
          </select>
          <input className={inputClass} inputMode="decimal" aria-label={`${t({ en: "Quantity", id: "Jumlah" })} ${i + 1}`} placeholder={t({ en: "Quantity", id: "Jumlah" })} value={r.qty} onChange={(e) => change(i, { qty: e.target.value })} />
        </div>
      ))}
      {usable.length === 0 && <p className="text-[14px] text-[#4F6B73]">{t({ en: "Add the item first on the Stock page.", id: "Tambahkan barangnya dulu di halaman Stok." })}</p>}
      <ActionNote action={action} />
      <div className="flex flex-wrap gap-2">
        <SecondaryButton disabled={usable.length === 0} onClick={() => setRows((all) => [...all, { itemId: usable[0].id, basis: "per_tanaman", qty: "" }])}><Plus className="h-4 w-4" /> {t({ en: "Add material", id: "Tambah bahan" })}</SecondaryButton>
        <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save materials", id: "Simpan bahan" })}</PrimaryButton>
      </div>
    </div>
  );
}

/** The band each reading should stay in, per phase. Read-only once the recipe is no longer a draft. */
function TargetsSection({ recipe, phases, canEdit }: { recipe: PfRecipe; phases: PfRecipePhase[]; canEdit: boolean }) {
  const targets = useLoad(() => fetchRecipeTargets(recipe.id), [recipe.id]);
  const [phase, setPhase] = useState<string>(phases[0]?.phase ?? "");
  const current = phases.some((p) => p.phase === phase) ? phase : phases[0]?.phase ?? "";
  const editable = canEdit && recipe.status === "draft";
  const t = useT();
  const lang = useLang();

  if (targets.error?.notInstalled || phases.length === 0) return null;
  return (
    <div className="mt-4 border-t border-[#E3ECED] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-medium text-[#0F2F36]">{t({ en: "Sensor reference", id: "Acuan sensor" })}</h3>
        <Segmented value={current} options={phases.map((p) => ({ key: p.phase as string, label: phaseLabel(p.phase, lang) }))} onChange={setPhase} />
      </div>
      <DataState state={targets}>
        {(list) => <TargetRows key={`${current}:${list.length}`} recipe={recipe} phase={current} list={list.filter((x) => x.phase === current)} editable={editable} onSaved={targets.reload} />}
      </DataState>
    </div>
  );
}

function TargetRows({ recipe, phase, list, editable, onSaved }: { recipe: PfRecipe; phase: string; list: RecipeTarget[]; editable: boolean; onSaved: () => Promise<void> }) {
  const text = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const [rows, setRows] = useState<TargetRow[]>(METRICS.map((m) => {
    const found = list.find((x) => x.metric === m.key);
    return { metric: m.key, low: text(found?.low), target: text(found?.target), high: text(found?.high) };
  }));
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const change = (i: number, patch: Partial<TargetRow>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  if (!editable) {
    if (list.length === 0) return <p className="text-[14px] text-[#4F6B73]">{t({ en: "This phase has no reference yet.", id: "Fase ini belum punya acuan." })}{recipe.status !== "draft" ? t({ en: " Create a new version to add it.", id: " Buat versi baru untuk menambahkannya." }) : ""}</p>;
    return (
      <ul className="text-[14px]">
        {list.map((x) => (
          <li key={x.metric} className="flex justify-between gap-3 border-t border-[#EDF2F2] py-2 first:border-0">
            <span className="text-[#4F6B73]">{metricLabel(x.metric, lang)}</span>
            <span className="font-medium tabular-nums text-[#0F2F36]">{formatBand(x.metric, x, lang)}</span>
          </li>
        ))}
      </ul>
    );
  }

  const save = async () => {
    const parsed = parseTargetRows(rows, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await saveRecipeTargets(recipe.id, phase, parsed.targets);
      await onSaved();
    });
  };

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 text-[13px] font-medium text-[#4F6B73] sm:grid"><span>{t({ en: "Reading", id: "Bacaan" })}</span><span>{t({ en: "Lower", id: "Bawah" })}</span><span>Target</span><span>{t({ en: "Top", id: "Atas" })}</span></div>
      {rows.map((r, i) => {
        const info = { ...metricInfo(r.metric), label: metricLabel(r.metric, lang) };
        return (
          <div key={r.metric} className="grid grid-cols-3 items-center gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <span className="col-span-3 text-[14px] text-[#0F2F36] sm:col-span-1">{info.label}{info.unit ? <span className="text-[#4F6B73]"> ({info.unit})</span> : null}</span>
            <input className={inputClass} inputMode="decimal" aria-label={t({ en: `${info.label} lower limit`, id: `Batas bawah ${info.label}` })} placeholder={t({ en: "Lower", id: "Bawah" })} value={r.low} onChange={(e) => change(i, { low: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`Target ${info.label}`} placeholder="Target" value={r.target} onChange={(e) => change(i, { target: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={t({ en: `${info.label} upper limit`, id: `Batas atas ${info.label}` })} placeholder={t({ en: "Top", id: "Atas" })} value={r.high} onChange={(e) => change(i, { high: e.target.value })} />
          </div>
        );
      })}
      <ActionNote action={action} />
      <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save references", id: "Simpan acuan" })}</PrimaryButton>
    </div>
  );
}

function PhaseEditor({ recipe, phases, onSaved }: { recipe: PfRecipe; phases: PfRecipePhase[]; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState<PhaseForm[]>(phases.map(phaseToForm));
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const t = useT();
  const lang = useLang();

  const change = (i: number, patch: Partial<PhaseForm>) => {
    setSaved(false);
    setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  };
  const add = () => {
    setSaved(false);
    const used = new Set(rows.map((r) => r.phase));
    const next = RECIPE_PHASES.find((p) => !used.has(p.key))?.key ?? "vegetatif";
    setRows((r) => [...r, { phase: next, durationDays: "", photoperiodH: "", ppfdUmol: "" }]);
  };
  const remove = (i: number) => {
    setSaved(false);
    setRows((r) => r.filter((_, n) => n !== i));
  };
  const save = async () => {
    const parsed = parsePhaseForms(rows, lang);
    if (!parsed.fields) return action.setError(parsed.error);
    if (await action.run(() => savePhases(recipe.id, parsed.fields))) {
      await onSaved();
      setSaved(true);
    }
  };

  return (
    <div>
      <div className="space-y-2">
        <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_36px] gap-2 text-[13px] font-medium text-[#4F6B73] sm:grid">
          <span>{t({ en: "Phase", id: "Fase" })}</span><span>{t({ en: "Length (days)", id: "Lama (hari)" })}</span><span>{t({ en: "Photoperiod (hours)", id: "Fotoperiode (jam)" })}</span><span>PPFD (µmol/m²/s)</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-[#E3ECED] p-2 sm:grid-cols-[1.3fr_1fr_1fr_1fr_36px] sm:border-0 sm:p-0">
            <select className={`${inputClass} col-span-2 sm:col-span-1`} aria-label={`${t({ en: "Phase", id: "Fase" })} ${i + 1}`} value={r.phase} onChange={(e) => change(i, { phase: e.target.value as RecipePhaseKey })}>
              {RECIPE_PHASES.map((p) => <option key={p.key} value={p.key}>{phaseLabel(p.key, lang)}</option>)}
            </select>
            <input className={inputClass} inputMode="numeric" aria-label={t({ en: `Length of phase ${i + 1} in days`, id: `Lama fase ${i + 1} dalam hari` })} placeholder={t({ en: "Day", id: "Hari" })} value={r.durationDays} onChange={(e) => change(i, { durationDays: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={t({ en: `Photoperiod of phase ${i + 1} in hours`, id: `Fotoperiode fase ${i + 1} dalam jam` })} placeholder={t({ en: "Hours", id: "Jam" })} value={r.photoperiodH} onChange={(e) => change(i, { photoperiodH: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={t({ en: `PPFD of phase ${i + 1}`, id: `PPFD fase ${i + 1}` })} placeholder="PPFD" value={r.ppfdUmol} onChange={(e) => change(i, { ppfdUmol: e.target.value })} />
            <button type="button" onClick={() => remove(i)} className="grid h-9 w-9 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#FBEDEC] hover:text-[#D9433B]" aria-label={t({ en: `Remove phase ${i + 1}`, id: `Hapus fase ${i + 1}` })}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2"><ActionNote action={action} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SecondaryButton onClick={add}><Plus className="h-4 w-4" /> {t({ en: "Add phase", id: "Tambah fase" })}</SecondaryButton>
        <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save phases", id: "Simpan fase" })}</PrimaryButton>
        {saved && <span className="text-[13px] font-medium text-[#0E7A5C]">{t({ en: "Saved", id: "Tersimpan" })}</span>}
      </div>
    </div>
  );
}

function Detail({ recipe, siblings, crop, canEdit, onChanged, onSelect }: {
  recipe: PfRecipe;
  siblings: PfRecipe[];
  crop: PfCrop | undefined;
  canEdit: boolean;
  onChanged: () => Promise<void>;
  onSelect: (id: string | null) => void;
}) {
  const phases = useLoad(() => fetchRecipePhases(recipe.id), [recipe.id]);
  const action = useAction();
  const [confirming, setConfirming] = useState<"activate" | "retire" | "delete" | null>(null);
  const [notes, setNotes] = useState(recipe.notes);
  const isDraft = recipe.status === "draft";
  const hasDraft = siblings.some((s) => s.status === "draft");
  const activeNow = siblings.find((s) => s.status === "active");
  const total = totalDays(phases.data ?? []);
  const t = useT();
  const lang = useLang();

  const run = async (work: () => Promise<void>, next?: string | null) => {
    setConfirming(null);
    if (await action.run(work)) {
      await onChanged();
      if (next !== undefined) onSelect(next);
    }
  };

  const copyToNewVersion = async () => {
    let created = "";
    await run(async () => { created = await newRecipeVersion(recipe.id); });
    if (created) onSelect(created);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E3ECED] pb-3">
        <div>
          <p className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477]">{crop ? cropLabel(crop) : t({ en: "Crops", id: "Tanaman" })}</p>
          <h2 className="flex flex-wrap items-center gap-2 text-[20px] font-semibold tracking-[-0.025em] text-[#0F2F36]">
            {recipe.code} v{recipe.version} <StatusBadge status={recipe.status} />
          </h2>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {!isDraft && !hasDraft && <SecondaryButton disabled={action.busy} onClick={() => void copyToNewVersion()}><Copy className="h-4 w-4" /> {t({ en: "Create a new version", id: "Buat versi baru" })}</SecondaryButton>}
            {isDraft && <SecondaryButton disabled={action.busy} onClick={() => setConfirming("delete")}>{t({ en: "Delete draft", id: "Hapus draf" })}</SecondaryButton>}
            {recipe.status === "active" && <SecondaryButton disabled={action.busy} onClick={() => setConfirming("retire")}>{t({ en: "End recipe", id: "Akhiri resep" })}</SecondaryButton>}
            {isDraft && <PrimaryButton disabled={action.busy || !phases.data?.length} onClick={() => setConfirming("activate")}>{t({ en: "Activate", id: "Aktifkan" })}</PrimaryButton>}
          </div>
        )}
      </div>

      {confirming && (
        <div className="mt-3 rounded-lg bg-[#FFF6E5] p-3 text-[14px] text-[#8A5A07]">
          <p>
            {confirming === "activate" && <>{t({ en: "Once active, this version can no longer be edited.", id: "Setelah aktif, versi ini tidak bisa diubah lagi." })}{activeNow ? t({ en: ` ${activeNow.code} v${activeNow.version} will be ended.`, id: ` ${activeNow.code} v${activeNow.version} akan diakhiri.` }) : ""}</>}
            {confirming === "retire" && <>{t({ en: "This recipe is ended and can no longer be chosen for a new batch. Its contents stay on record.", id: "Resep ini diakhiri dan tidak bisa dipilih lagi untuk batch baru. Isinya tetap tersimpan." })}</>}
            {confirming === "delete" && <>{t({ en: "This draft and all its phases will be deleted.", id: "Draf ini beserta semua fasenya akan dihapus." })}</>}
          </p>
          <div className="mt-2 flex gap-2">
            <PrimaryButton
              disabled={action.busy}
              onClick={() => {
                if (confirming === "activate") void run(() => activateRecipe(recipe.id));
                else if (confirming === "retire") void run(() => retireRecipe(recipe.id));
                else void run(() => deleteRecipeDraft(recipe.id), activeNow?.id ?? null);
              }}
            >
              {confirming === "activate" ? t({ en: "Yes, activate", id: "Ya, aktifkan" }) : confirming === "retire" ? t({ en: "Yes, end it", id: "Ya, akhiri" }) : t({ en: "Yes, delete", id: "Ya, hapus" })}
            </PrimaryButton>
            <SecondaryButton onClick={() => setConfirming(null)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
          </div>
        </div>
      )}
      {action.error && <div className="mt-3"><Note tone="warn">{action.error}</Note></div>}

      <div className="mt-4">
        <h3 className="mb-2 text-[15px] font-medium text-[#0F2F36]">{t({ en: "Phase", id: "Fase" })}</h3>
        <DataState state={phases}>
          {(list) =>
            isDraft && canEdit ? (
              <PhaseEditor key={recipe.id} recipe={recipe} phases={list} onSaved={phases.reload} />
            ) : list.length === 0 ? (
              <p className="text-[14px] text-[#4F6B73]">{t({ en: "No phases yet.", id: "Belum ada fase." })}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-[13px] text-[#4F6B73]">
                    <tr><th className="pb-2 font-medium">{t({ en: "Phase", id: "Fase" })}</th><th className="pb-2 font-medium">{t({ en: "Length", id: "Lama" })}</th><th className="pb-2 font-medium">{t({ en: "Photoperiod", id: "Fotoperiode" })}</th><th className="pb-2 font-medium">PPFD</th></tr>
                  </thead>
                  <tbody className="text-[#0F2F36]">
                    {list.map((p) => (
                      <tr key={p.id} className="border-t border-[#E3ECED]">
                        <td className="py-2 font-medium">{phaseLabel(p.phase, lang)}</td>
                        <td className="py-2">{t({ en: `${p.duration_days} days`, id: `${p.duration_days} hari` })}</td>
                        <td className="py-2">{p.photoperiod_h != null ? t({ en: `${p.photoperiod_h} hours`, id: `${p.photoperiod_h} jam` }) : t({ en: "Not set", id: "Belum diatur" })}</td>
                        <td className="py-2">{p.ppfd_umol != null ? `${p.ppfd_umol} µmol/m²/s` : t({ en: "Not set", id: "Belum diatur" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </DataState>
        {total > 0 && (
          <p className="mt-2 text-[13px] text-[#4F6B73]">
            {t({ en: `Total ${total} days`, id: `Total ${total} hari` })}{crop?.cycle_days ? t({ en: `, crop cycle ${crop.cycle_days} days`, id: `, siklus tanaman ${crop.cycle_days} hari` }) : ""}.
            {crop?.cycle_days && crop.cycle_days !== total ? t({ en: " The two differ. Check again if that was not intended.", id: " Keduanya berbeda. Periksa lagi jika itu tidak disengaja." }) : ""}
          </p>
        )}
        <TargetsSection recipe={recipe} phases={phases.data ?? []} canEdit={canEdit} />
        <MaterialsSection recipe={recipe} canEdit={canEdit} />
      </div>

      <div className="mt-4 border-t border-[#E3ECED] pt-3">
        {isDraft && canEdit ? (
          <Field label={t({ en: "Notes", id: "Catatan" })}>
            <textarea
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => { if (notes !== recipe.notes) void run(() => updateRecipeNotes(recipe.id, notes.trim())); }}
            />
          </Field>
        ) : recipe.notes ? (
          <p className="text-[14px] text-[#4F6B73]">{recipe.notes}</p>
        ) : null}
      </div>
    </Card>
  );
}

export default function RecipesPage() {
  const state = useLoad(async () => {
    const [recipes, crops] = await Promise.all([fetchRecipes(), fetchCrops()]);
    return { recipes, crops };
  });
  const { canManageProduction } = useErpAccess();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const t = useT();
  const groups = useMemo(() => groupRecipes(state.data?.recipes ?? []), [state.data]);
  const recipe = state.data?.recipes.find((r) => r.id === selected) ?? groups[0]?.current;

  return (
    <ErpPage
      eyebrow={t({ en: "Master data", id: "Data master" })}
      title={t({ en: "Recipes", id: "Resep" })}
      sub={t({ en: "Any change to an active recipe becomes a new version, so older batches keep pointing at the recipe they used.", id: "Setiap perubahan pada resep aktif menjadi versi baru, jadi batch lama tetap merujuk ke resep yang dipakainya." })}
      actions={canManageProduction && !creating && !state.error?.notInstalled ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t({ en: "New recipe", id: "Resep baru" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ crops }) => (
          <div className="space-y-3">
            {!canManageProduction && <ReadOnlyNote who={t({ en: "Production manager", id: "Manajer produksi" })} />}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-3">
                {creating && (
                  <NewRecipe
                    crops={crops}
                    onCancel={() => setCreating(false)}
                    onCreated={(id) => {
                      setCreating(false);
                      void state.reload().then(() => setSelected(id));
                    }}
                  />
                )}
                <Card className="p-2">
                  {groups.length === 0 && <p className="px-2 py-6 text-center text-[14px] text-[#4F6B73]">{t({ en: "No recipes yet.", id: "Belum ada resep." })}</p>}
                  {groups.map((g) => {
                    const crop = crops.find((c) => c.id === g.cropId);
                    return (
                      <div key={g.code} className="border-b border-[#E3ECED] py-1.5 last:border-0">
                        <p className="px-2 text-[14px] font-medium text-[#0F2F36]">{g.code}</p>
                        <p className="px-2 pb-1 text-[13px] text-[#4F6B73]">{crop ? cropLabel(crop) : ""}</p>
                        {g.versions.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelected(v.id)}
                            aria-current={recipe?.id === v.id}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[14px] ${recipe?.id === v.id ? "bg-[#E3F7F0]" : "hover:bg-[#F3F7F7]"}`}
                          >
                            <span className="text-[#0F2F36]">{t({ en: "Version", id: "Versi" })} {v.version}</span>
                            <StatusBadge status={v.status} />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </Card>
              </div>
              {recipe && (
                <Detail
                  key={recipe.id}
                  recipe={recipe}
                  siblings={state.data!.recipes.filter((r) => r.code === recipe.code)}
                  crop={crops.find((c) => c.id === recipe.crop_id)}
                  canEdit={canManageProduction}
                  onChanged={state.reload}
                  onSelect={setSelected}
                />
              )}
            </div>
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}
