import { useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  RECIPE_CODE,
  RECIPE_PHASES,
  RECIPE_STATUS,
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
import { Card, Note } from "./ui";

// Versioned recipes. Only a draft can be edited: once active, a change means a
// new version, so a batch can always say exactly which recipe it grew under.

function StatusBadge({ status }: { status: PfRecipe["status"] }) {
  const s = RECIPE_STATUS[status];
  return <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-medium ${s.className}`}>{s.label}</span>;
}

function NewRecipe({ crops, onCreated, onCancel }: { crops: PfCrop[]; onCreated: (id: string) => void; onCancel: () => void }) {
  const usable = crops.filter((c) => c.active);
  const [cropId, setCropId] = useState(usable[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const action = useAction();

  const submit = async () => {
    const normalized = normalizeRecipeCode(code);
    if (!cropId) return action.setError("Pilih tanaman dulu.");
    if (!RECIPE_CODE.test(normalized)) return action.setError("Kode hanya boleh huruf, angka, dan tanda hubung.");
    let created = "";
    if (await action.run(async () => { created = await createRecipe(cropId, normalized, notes.trim()); })) onCreated(created);
  };

  if (usable.length === 0) return <Note tone="warn">Belum ada tanaman aktif. Tambahkan dulu di menu Tanaman.</Note>;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Resep baru</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Tanaman">
          <select className={inputClass} value={cropId} onChange={(e) => setCropId(e.target.value)}>
            {usable.map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
          </select>
        </Field>
        <Field label="Kode resep" hint="Contoh RSP-SEL-03. Tidak berubah antar versi.">
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="RSP-SEL-03" />
        </Field>
        <Field label="Catatan"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>Buat draf</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Batal</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function PhaseEditor({ recipe, phases, onSaved }: { recipe: PfRecipe; phases: PfRecipePhase[]; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState<PhaseForm[]>(phases.map(phaseToForm));
  const [saved, setSaved] = useState(false);
  const action = useAction();

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
    const parsed = parsePhaseForms(rows);
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
          <span>Fase</span><span>Lama (hari)</span><span>Fotoperiode (jam)</span><span>PPFD (µmol/m²/s)</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-[#E3ECED] p-2 sm:grid-cols-[1.3fr_1fr_1fr_1fr_36px] sm:border-0 sm:p-0">
            <select className={`${inputClass} col-span-2 sm:col-span-1`} aria-label={`Fase ${i + 1}`} value={r.phase} onChange={(e) => change(i, { phase: e.target.value as RecipePhaseKey })}>
              {RECIPE_PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <input className={inputClass} inputMode="numeric" aria-label={`Lama fase ${i + 1} dalam hari`} placeholder="Hari" value={r.durationDays} onChange={(e) => change(i, { durationDays: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`Fotoperiode fase ${i + 1} dalam jam`} placeholder="Jam" value={r.photoperiodH} onChange={(e) => change(i, { photoperiodH: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`PPFD fase ${i + 1}`} placeholder="PPFD" value={r.ppfdUmol} onChange={(e) => change(i, { ppfdUmol: e.target.value })} />
            <button type="button" onClick={() => remove(i)} className="grid h-9 w-9 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#FBEDEC] hover:text-[#D9433B]" aria-label={`Hapus fase ${i + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2"><ActionNote action={action} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SecondaryButton onClick={add}><Plus className="h-4 w-4" /> Tambah fase</SecondaryButton>
        <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? "Menyimpan..." : "Simpan fase"}</PrimaryButton>
        {saved && <span className="text-[13px] font-medium text-[#0E7A5C]">Tersimpan</span>}
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
          <p className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477]">{crop ? cropLabel(crop) : "Tanaman"}</p>
          <h2 className="flex flex-wrap items-center gap-2 text-[20px] font-semibold tracking-[-0.025em] text-[#0F2F36]">
            {recipe.code} v{recipe.version} <StatusBadge status={recipe.status} />
          </h2>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {!isDraft && !hasDraft && <SecondaryButton disabled={action.busy} onClick={() => void copyToNewVersion()}><Copy className="h-4 w-4" /> Buat versi baru</SecondaryButton>}
            {isDraft && <SecondaryButton disabled={action.busy} onClick={() => setConfirming("delete")}>Hapus draf</SecondaryButton>}
            {recipe.status === "active" && <SecondaryButton disabled={action.busy} onClick={() => setConfirming("retire")}>Akhiri resep</SecondaryButton>}
            {isDraft && <PrimaryButton disabled={action.busy || !phases.data?.length} onClick={() => setConfirming("activate")}>Aktifkan</PrimaryButton>}
          </div>
        )}
      </div>

      {confirming && (
        <div className="mt-3 rounded-lg bg-[#FFF6E5] p-3 text-[14px] text-[#8A5A07]">
          <p>
            {confirming === "activate" && <>Setelah aktif, versi ini tidak bisa diedit lagi.{activeNow ? ` ${activeNow.code} v${activeNow.version} akan diakhiri.` : ""}</>}
            {confirming === "retire" && <>Resep ini diakhiri dan tidak lagi bisa dipilih untuk batch baru. Isinya tetap tersimpan.</>}
            {confirming === "delete" && <>Draf ini dan semua fasenya akan dihapus.</>}
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
              {confirming === "activate" ? "Ya, aktifkan" : confirming === "retire" ? "Ya, akhiri" : "Ya, hapus"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setConfirming(null)}>Batal</SecondaryButton>
          </div>
        </div>
      )}
      {action.error && <div className="mt-3"><Note tone="warn">{action.error}</Note></div>}

      <div className="mt-4">
        <h3 className="mb-2 text-[15px] font-medium text-[#0F2F36]">Fase</h3>
        <DataState state={phases}>
          {(list) =>
            isDraft && canEdit ? (
              <PhaseEditor key={recipe.id} recipe={recipe} phases={list} onSaved={phases.reload} />
            ) : list.length === 0 ? (
              <p className="text-[14px] text-[#4F6B73]">Belum ada fase.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-[13px] text-[#4F6B73]">
                    <tr><th className="pb-2 font-medium">Fase</th><th className="pb-2 font-medium">Lama</th><th className="pb-2 font-medium">Fotoperiode</th><th className="pb-2 font-medium">PPFD</th></tr>
                  </thead>
                  <tbody className="text-[#0F2F36]">
                    {list.map((p) => (
                      <tr key={p.id} className="border-t border-[#E3ECED]">
                        <td className="py-2 font-medium">{phaseLabel(p.phase)}</td>
                        <td className="py-2">{p.duration_days} hari</td>
                        <td className="py-2">{p.photoperiod_h != null ? `${p.photoperiod_h} jam` : "Belum diisi"}</td>
                        <td className="py-2">{p.ppfd_umol != null ? `${p.ppfd_umol} µmol/m²/s` : "Belum diisi"}</td>
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
            Total {total} hari{crop?.cycle_days ? `, siklus tanaman ${crop.cycle_days} hari` : ""}.
            {crop?.cycle_days && crop.cycle_days !== total ? " Keduanya berbeda, periksa lagi kalau tidak disengaja." : ""}
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-[#E3ECED] pt-3">
        {isDraft && canEdit ? (
          <Field label="Catatan">
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
  const groups = useMemo(() => groupRecipes(state.data?.recipes ?? []), [state.data]);
  const recipe = state.data?.recipes.find((r) => r.id === selected) ?? groups[0]?.current;

  return (
    <ErpPage
      eyebrow="Budidaya"
      title="Resep"
      sub="Setiap perubahan pada resep aktif menjadi versi baru, jadi batch lama tetap menunjuk resep yang dipakainya."
      actions={canManageProduction && !creating && !state.error?.notInstalled ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Resep baru</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ crops }) => (
          <div className="space-y-3">
            {!canManageProduction && <ReadOnlyNote who="Manajer produksi" />}
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
                  {groups.length === 0 && <p className="px-2 py-6 text-center text-[14px] text-[#4F6B73]">Belum ada resep.</p>}
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
                            <span className="text-[#0F2F36]">Versi {v.version}</span>
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
