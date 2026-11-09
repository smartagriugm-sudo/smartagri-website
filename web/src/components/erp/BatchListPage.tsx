import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { addDays } from "../../lib/pf/facility";
import { BATCH_STATUS, batchLabel, batchStage, createBatch, fetchActiveRecipes, fetchBatches, fetchSeedLots, germinationRate, isLotUsable, jakartaToday, tierSanitized, type ActiveRecipe, type BatchOverview, type SeedLot } from "../../lib/pf/batch";
import { cropLabel } from "../../lib/pf/foundation";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Every batch and where it stands, the start of a new one, and the tiers waiting
// for someone to finish cleaning them. A batch's own work is on its detail page.

function NewBatch({ recipes, lots, onDone }: { recipes: ActiveRecipe[]; lots: SeedLot[]; onDone: () => void }) {
  const today = jakartaToday();
  const navigate = useNavigate();
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const recipe = recipes.find((r) => r.id === recipeId);
  const usable = lots.filter((l) => l.crop_id === recipe?.crop_id && isLotUsable(l, today));
  const [lotId, setLotId] = useState("");
  const chosenLot = usable.find((l) => l.id === lotId) ?? usable[0];
  const [notes, setNotes] = useState("");
  const action = useAction();

  const submit = async () => {
    if (!recipe || !chosenLot) return action.setError("Choose a recipe and seed lot.");
    let created = "";
    if (await action.run(async () => { created = await createBatch(recipe.id, chosenLot.id, notes); })) {
      void navigate({ to: "/erp/batch/$id", params: { id: created } });
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">New batch</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Recipe" hint="Its version is locked for this batch.">
          <select className={inputClass} value={recipeId} onChange={(e) => { setRecipeId(e.target.value); setLotId(""); }}>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.code} v{r.version}</option>)}
          </select>
        </Field>
        <Field label="Seed lot">
          <select className={inputClass} value={chosenLot?.id ?? ""} onChange={(e) => setLotId(e.target.value)} disabled={usable.length === 0}>
            {usable.length === 0 && <option value="">No lots for this crop</option>}
            {usable.map((l) => <option key={l.id} value={l.id}>{l.lot_no} · {cropLabel({ name: l.crop_name, variety: l.crop_variety })} · left {l.qty_on_hand.toLocaleString("en-GB")} {l.unit}</option>)}
          </select>
        </Field>
        {usable.length === 0 && <Note>Add a lot for this crop on the page <Link to="/erp/seed-lots" className="font-medium text-[#0B6477] hover:underline">Seed lots</Link>.</Note>}
        <Field label="Notes"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy || !chosenLot}>{action.busy ? "Saving…" : "Create batch"}</PrimaryButton>
          <SecondaryButton onClick={onDone}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

/** Asks once: a tier marked clean takes the next batch, and there is no undo on this page. */
function SanitationRow({ rack, tier, code, canOperate }: { rack: number; tier: number; code: string; canOperate: boolean }) {
  const store = useErpStore();
  const [asking, setAsking] = useState(false);
  const action = useAction();
  return (
    <div className="rounded-lg border border-[#E3ECED] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-medium text-[#0F2F36]">Rack {rack} · Tier {tier}</span>
        {canOperate && !asking && <SecondaryButton onClick={() => setAsking(true)}>Mark as clean</SecondaryButton>}
        {canOperate && asking && (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[#4F6B73]">Is it clean?</span>
            <SecondaryButton
              disabled={action.busy}
              onClick={() => void action.run(async () => {
                await tierSanitized(store.locationIds.get(code) ?? "");
                await store.load();
              })}
            >
              {action.busy ? "Saving…" : "Yes, it is"}
            </SecondaryButton>
            <SecondaryButton disabled={action.busy} onClick={() => setAsking(false)}>Cancel</SecondaryButton>
          </span>
        )}
      </div>
      <div className="mt-1 empty:hidden"><ActionNote action={action} /></div>
    </div>
  );
}

function SanitationCard({ canOperate }: { canOperate: boolean }) {
  const store = useErpStore();
  const tiers = store.mode === "sample" ? [] : store.tiersInSanitation();
  if (tiers.length === 0) return null;
  return (
    <Card className="p-4">
      <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Waiting for sanitation</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">This tier takes a batch only after it is marked clean.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tiers.map((t) => <SanitationRow key={t.code} rack={t.rack} tier={t.tier} code={t.code} canOperate={canOperate} />)}
      </div>
    </Card>
  );
}


export default function BatchListPage() {
  const state = useLoad(async () => {
    const [batches, recipes, lots] = await Promise.all([fetchBatches(), fetchActiveRecipes(), fetchSeedLots()]);
    return { batches, recipes, lots };
  });
  const { canManageProduction, canOperate } = useErpAccess();
  const [creating, setCreating] = useState(false);
  const today = jakartaToday();

  const noRecipe = state.data !== null && state.data.recipes.length === 0;

  return (
    <ErpPage
      eyebrow="Growing"
      title="Batch"
      sub="A batch runs from sowing in the chamber to harvest in the plant factory."
      actions={canManageProduction && !creating && state.data !== null && !noRecipe ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New batch</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ batches, recipes, lots }) => {
          const active = batches.filter((b) => b.status === "direncanakan" || b.status === "berjalan");
          const closed = batches.filter((b) => b.status === "selesai" || b.status === "gagal");
          // Nearest harvest first, batches not sown yet last.
          const harvestOn = (b: BatchOverview) => (b.sown_at ? addDays(b.sown_at, b.cycle_days) : "9999");
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${creating ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canOperate && <ReadOnlyNote who="Operator or Production manager" />}
                {canManageProduction && noRecipe && (
                  <Note>A batch uses an active recipe. Activate one first on the page <Link to="/erp/recipes" className="font-medium text-[#0B6477] hover:underline">Recipes</Link>.</Note>
                )}
                <SanitationCard canOperate={canOperate} />
                <DataTable
                  rows={[...active].sort((a, b) => harvestOn(a).localeCompare(harvestOn(b))).concat(closed)}
                  rowKey={(b) => b.id}
                  noun="batches"
                  rowLink={(b) => `/erp/batch/${b.id}`}
                  searchText={(b) => `${b.code} ${batchLabel(b)} ${b.recipe_code} ${b.seed_lot_no}`}
                  searchLabel="Search by batch, crop, recipe or lot"
                  initialPill="active"
                  pills={[
                    { key: "active", label: "Active", dot: "#14919B", match: (b) => b.status === "direncanakan" || b.status === "berjalan" },
                    { key: "closed", label: "Closed", dot: "#8FA3A8", match: (b) => b.status === "selesai" || b.status === "gagal" },
                  ]}
                  filters={[{ label: "Filter by crop", all: "All crops", value: (b) => batchLabel(b) }]}
                  empty="No batches yet."
                  columns={[
                    { key: "code", label: "Batch", track: "minmax(0,1.3fr)", phone: "title", sort: (a, b) => a.code.localeCompare(b.code), cell: (b) => <CellTitle title={b.code} sub={batchLabel(b)} /> },
                    { key: "stage", label: "Stage", sort: (a, b) => a.status.localeCompare(b.status), cell: (b) => b.status === "direncanakan" || b.status === "berjalan" ? <Chip label={batchStage(b, today)} className={BATCH_STATUS[b.status].className} /> : <Chip label={BATCH_STATUS[b.status].label} className={BATCH_STATUS[b.status].className} /> },
                    { key: "recipe", label: "Recipe and lot", phone: "hidden", cell: (b) => <span className="block truncate text-[13px]">{b.recipe_code} v{b.recipe_version} · lot {b.seed_lot_no}</span> },
                    { key: "germination", label: "Germination", track: "110px", align: "right", sort: (a, b) => germinationRate(a) - germinationRate(b), cell: (b) => <span className="tabular-nums">{b.seeds > 0 ? `${Math.round(germinationRate(b) * 100)}%` : "-"}</span> },
                    { key: "plants", label: "Plants", track: "90px", align: "right", sort: (a, b) => a.plants_now - b.plants_now, cell: (b) => <span className="tabular-nums">{b.plants_now || "-"}</span> },
                    { key: "harvest", label: "Harvest", track: "100px", align: "right", sort: (a, b) => a.harvested_kg - b.harvested_kg, cell: (b) => <span className="tabular-nums">{b.harvested_kg > 0 ? `${b.harvested_kg.toLocaleString("en-GB")} kg` : "-"}</span> },
                  ] satisfies Column<BatchOverview>[]}
                />
              </div>
              {creating && <NewBatch recipes={recipes} lots={lots} onDone={() => setCreating(false)} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
