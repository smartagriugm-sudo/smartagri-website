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
import { Card, Note, Segmented } from "./ui";
import { MATERIAL_BASES, fetchItems, fetchRecipeMaterials, formatQty, parseMaterialRows, saveRecipeMaterials, type MaterialBasis } from "../../lib/pf/inventory";
import { METRICS, fetchRecipeTargets, formatBand, metricInfo, parseTargetRows, saveRecipeTargets, type RecipeTarget, type TargetRow } from "../../lib/pf/monitoring";

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
    if (!cropId) return action.setError("Choose a crop first.");
    if (!RECIPE_CODE.test(normalized)) return action.setError("A code can only have letters, numbers and hyphens.");
    let created = "";
    if (await action.run(async () => { created = await createRecipe(cropId, normalized, notes.trim()); })) onCreated(created);
  };

  if (usable.length === 0) return <Note tone="warn">No active crops yet. Add one first under Crops.</Note>;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">New recipe</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Crop">
          <select className={inputClass} value={cropId} onChange={(e) => setCropId(e.target.value)}>
            {usable.map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
          </select>
        </Field>
        <Field label="Recipe code" hint="For example RSP-SEL-03. It stays the same between versions.">
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="RSP-SEL-03" />
        </Field>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>Create draft</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
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
  if (state.error?.notInstalled) return null;
  return (
    <div className="mt-4 border-t border-[#E3ECED] pt-3">
      <h3 className="mb-1 text-[15px] font-medium text-[#0F2F36]">Materials used up automatically</h3>
      <p className="mb-2 text-[13px] text-[#4F6B73]">Stock goes down when an operator records sowing, transplanting or harvest. If stock runs short, the work carries on and the shortage shows on the Stock page.</p>
      <DataState state={state}>
        {({ materials, items }) => (canEdit && recipe.status === "draft"
          ? <MaterialRows key={recipe.id} recipe={recipe} initial={materials.map((m) => ({ itemId: m.item_id, basis: m.basis, qty: String(m.qty).replace(".", ",") }))} items={items} onSaved={state.reload} />
          : materials.length === 0
            ? <p className="text-[14px] text-[#4F6B73]">No materials yet.{recipe.status !== "draft" ? " Create a new version to add it." : ""}</p>
            : (
              <ul className="text-[14px]">
                {materials.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 border-t border-[#EDF2F2] py-2 first:border-0">
                    <span className="text-[#0F2F36]">{m.item_name}</span>
                    <span className="tabular-nums text-[#4F6B73]">{formatQty(m.qty, m.unit)} {MATERIAL_BASES.find((b) => b.key === m.basis)?.label.toLowerCase()}</span>
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
  const change = (i: number, patch: Partial<{ itemId: string; basis: MaterialBasis; qty: string }>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  const save = async () => {
    const parsed = parseMaterialRows(rows);
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
          <select className={`${inputClass} sm:order-none`} aria-label={`Item ${i + 1}`} value={r.itemId} onChange={(e) => change(i, { itemId: e.target.value })}>
            {usable.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}
          </select>
          <button type="button" onClick={() => setRows((all) => all.filter((_, n) => n !== i))} aria-label={`Remove material ${i + 1}`} className="grid h-11 w-10 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#FBEDEC] hover:text-[#D9433B] sm:order-last sm:h-9"><Trash2 className="h-4 w-4" /></button>
          <select className={inputClass} aria-label={`Usage basis ${i + 1}`} value={r.basis} onChange={(e) => change(i, { basis: e.target.value as MaterialBasis })}>
            {MATERIAL_BASES.map((b) => <option key={b.key} value={b.key}>{b.label}, {b.when}</option>)}
          </select>
          <input className={inputClass} inputMode="decimal" aria-label={`Quantity ${i + 1}`} placeholder="Quantity" value={r.qty} onChange={(e) => change(i, { qty: e.target.value })} />
        </div>
      ))}
      {usable.length === 0 && <p className="text-[14px] text-[#4F6B73]">Add the item first on the Stock page.</p>}
      <ActionNote action={action} />
      <div className="flex flex-wrap gap-2">
        <SecondaryButton disabled={usable.length === 0} onClick={() => setRows((all) => [...all, { itemId: usable[0].id, basis: "per_tanaman", qty: "" }])}><Plus className="h-4 w-4" /> Add material</SecondaryButton>
        <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? "Saving…" : "Save materials"}</PrimaryButton>
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

  if (targets.error?.notInstalled || phases.length === 0) return null;
  return (
    <div className="mt-4 border-t border-[#E3ECED] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-medium text-[#0F2F36]">Sensor reference</h3>
        <Segmented value={current} options={phases.map((p) => ({ key: p.phase as string, label: phaseLabel(p.phase) }))} onChange={setPhase} />
      </div>
      <DataState state={targets}>
        {(list) => <TargetRows key={`${current}:${list.length}`} recipe={recipe} phase={current} list={list.filter((t) => t.phase === current)} editable={editable} onSaved={targets.reload} />}
      </DataState>
    </div>
  );
}

function TargetRows({ recipe, phase, list, editable, onSaved }: { recipe: PfRecipe; phase: string; list: RecipeTarget[]; editable: boolean; onSaved: () => Promise<void> }) {
  const text = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const [rows, setRows] = useState<TargetRow[]>(METRICS.map((m) => {
    const t = list.find((x) => x.metric === m.key);
    return { metric: m.key, low: text(t?.low), target: text(t?.target), high: text(t?.high) };
  }));
  const action = useAction();
  const change = (i: number, patch: Partial<TargetRow>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  if (!editable) {
    if (list.length === 0) return <p className="text-[14px] text-[#4F6B73]">This phase has no reference yet.{recipe.status !== "draft" ? " Create a new version to add it." : ""}</p>;
    return (
      <ul className="text-[14px]">
        {list.map((t) => (
          <li key={t.metric} className="flex justify-between gap-3 border-t border-[#EDF2F2] py-2 first:border-0">
            <span className="text-[#4F6B73]">{metricInfo(t.metric).label}</span>
            <span className="font-medium tabular-nums text-[#0F2F36]">{formatBand(t.metric, t)}</span>
          </li>
        ))}
      </ul>
    );
  }

  const save = async () => {
    const parsed = parseTargetRows(rows);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await saveRecipeTargets(recipe.id, phase, parsed.targets);
      await onSaved();
    });
  };

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 text-[13px] font-medium text-[#4F6B73] sm:grid"><span>Reading</span><span>Lower</span><span>Target</span><span>Top</span></div>
      {rows.map((r, i) => {
        const info = metricInfo(r.metric);
        return (
          <div key={r.metric} className="grid grid-cols-3 items-center gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <span className="col-span-3 text-[14px] text-[#0F2F36] sm:col-span-1">{info.label}{info.unit ? <span className="text-[#4F6B73]"> ({info.unit})</span> : null}</span>
            <input className={inputClass} inputMode="decimal" aria-label={`${info.label} lower limit`} placeholder="Lower" value={r.low} onChange={(e) => change(i, { low: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`${info.label} target`} placeholder="Target" value={r.target} onChange={(e) => change(i, { target: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`${info.label} upper limit`} placeholder="Top" value={r.high} onChange={(e) => change(i, { high: e.target.value })} />
          </div>
        );
      })}
      <ActionNote action={action} />
      <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? "Saving…" : "Save references"}</PrimaryButton>
    </div>
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
          <span>Phase</span><span>Length (days)</span><span>Photoperiod (hours)</span><span>PPFD (µmol/m²/s)</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-[#E3ECED] p-2 sm:grid-cols-[1.3fr_1fr_1fr_1fr_36px] sm:border-0 sm:p-0">
            <select className={`${inputClass} col-span-2 sm:col-span-1`} aria-label={`Phase ${i + 1}`} value={r.phase} onChange={(e) => change(i, { phase: e.target.value as RecipePhaseKey })}>
              {RECIPE_PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <input className={inputClass} inputMode="numeric" aria-label={`Length of phase ${i + 1} in days`} placeholder="Day" value={r.durationDays} onChange={(e) => change(i, { durationDays: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`Photoperiod of phase ${i + 1} in hours`} placeholder="Hours" value={r.photoperiodH} onChange={(e) => change(i, { photoperiodH: e.target.value })} />
            <input className={inputClass} inputMode="decimal" aria-label={`PPFD of phase ${i + 1}`} placeholder="PPFD" value={r.ppfdUmol} onChange={(e) => change(i, { ppfdUmol: e.target.value })} />
            <button type="button" onClick={() => remove(i)} className="grid h-9 w-9 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#FBEDEC] hover:text-[#D9433B]" aria-label={`Remove phase ${i + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2"><ActionNote action={action} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SecondaryButton onClick={add}><Plus className="h-4 w-4" /> Add phase</SecondaryButton>
        <PrimaryButton disabled={action.busy} onClick={() => void save()}>{action.busy ? "Saving…" : "Save phases"}</PrimaryButton>
        {saved && <span className="text-[13px] font-medium text-[#0E7A5C]">Saved</span>}
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
          <p className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477]">{crop ? cropLabel(crop) : "Crops"}</p>
          <h2 className="flex flex-wrap items-center gap-2 text-[20px] font-semibold tracking-[-0.025em] text-[#0F2F36]">
            {recipe.code} v{recipe.version} <StatusBadge status={recipe.status} />
          </h2>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {!isDraft && !hasDraft && <SecondaryButton disabled={action.busy} onClick={() => void copyToNewVersion()}><Copy className="h-4 w-4" /> Create a new version</SecondaryButton>}
            {isDraft && <SecondaryButton disabled={action.busy} onClick={() => setConfirming("delete")}>Delete draft</SecondaryButton>}
            {recipe.status === "active" && <SecondaryButton disabled={action.busy} onClick={() => setConfirming("retire")}>End recipe</SecondaryButton>}
            {isDraft && <PrimaryButton disabled={action.busy || !phases.data?.length} onClick={() => setConfirming("activate")}>Activate</PrimaryButton>}
          </div>
        )}
      </div>

      {confirming && (
        <div className="mt-3 rounded-lg bg-[#FFF6E5] p-3 text-[14px] text-[#8A5A07]">
          <p>
            {confirming === "activate" && <>Once active, this version can no longer be edited.{activeNow ? ` ${activeNow.code} v${activeNow.version} will be ended.` : ""}</>}
            {confirming === "retire" && <>This recipe is ended and can no longer be chosen for a new batch. Its contents stay on record.</>}
            {confirming === "delete" && <>This draft and all its phases will be deleted.</>}
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
              {confirming === "activate" ? "Yes, activate" : confirming === "retire" ? "Yes, end it" : "Yes, delete"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setConfirming(null)}>Cancel</SecondaryButton>
          </div>
        </div>
      )}
      {action.error && <div className="mt-3"><Note tone="warn">{action.error}</Note></div>}

      <div className="mt-4">
        <h3 className="mb-2 text-[15px] font-medium text-[#0F2F36]">Phase</h3>
        <DataState state={phases}>
          {(list) =>
            isDraft && canEdit ? (
              <PhaseEditor key={recipe.id} recipe={recipe} phases={list} onSaved={phases.reload} />
            ) : list.length === 0 ? (
              <p className="text-[14px] text-[#4F6B73]">No phases yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-[13px] text-[#4F6B73]">
                    <tr><th className="pb-2 font-medium">Phase</th><th className="pb-2 font-medium">Length</th><th className="pb-2 font-medium">Photoperiod</th><th className="pb-2 font-medium">PPFD</th></tr>
                  </thead>
                  <tbody className="text-[#0F2F36]">
                    {list.map((p) => (
                      <tr key={p.id} className="border-t border-[#E3ECED]">
                        <td className="py-2 font-medium">{phaseLabel(p.phase)}</td>
                        <td className="py-2">{p.duration_days} days</td>
                        <td className="py-2">{p.photoperiod_h != null ? `${p.photoperiod_h} hours` : "Not set"}</td>
                        <td className="py-2">{p.ppfd_umol != null ? `${p.ppfd_umol} µmol/m²/s` : "Not set"}</td>
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
            Total {total} days{crop?.cycle_days ? `, crop cycle ${crop.cycle_days} days` : ""}.
            {crop?.cycle_days && crop.cycle_days !== total ? " The two differ. Check again if that was not intended." : ""}
          </p>
        )}
        <TargetsSection recipe={recipe} phases={phases.data ?? []} canEdit={canEdit} />
        <MaterialsSection recipe={recipe} canEdit={canEdit} />
      </div>

      <div className="mt-4 border-t border-[#E3ECED] pt-3">
        {isDraft && canEdit ? (
          <Field label="Notes">
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
      eyebrow="Master data"
      title="Recipes"
      sub="Any change to an active recipe becomes a new version, so older batches keep pointing at the recipe they used."
      actions={canManageProduction && !creating && !state.error?.notInstalled ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New recipe</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ crops }) => (
          <div className="space-y-3">
            {!canManageProduction && <ReadOnlyNote who="Production manager" />}
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
                  {groups.length === 0 && <p className="px-2 py-6 text-center text-[14px] text-[#4F6B73]">No recipes yet.</p>}
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
                            <span className="text-[#0F2F36]">Version {v.version}</span>
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
