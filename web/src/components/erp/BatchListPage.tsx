import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { addDays } from "../../lib/pf/facility";
import { BATCH_STATUS, batchLabel, batchStage, batchStatusLabel, createBatch, fetchActiveRecipes, fetchBatches, fetchSeedLots, germinationRate, isLotUsable, jakartaToday, tierSanitized, type ActiveRecipe, type BatchOverview, type SeedLot } from "../../lib/pf/batch";
import { cropLabel } from "../../lib/pf/foundation";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";
import { localeOf, useLang, useT } from "../../lib/i18n";

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
  const t = useT();
  const lang = useLang();

  const submit = async () => {
    if (!recipe || !chosenLot) return action.setError(t({ en: "Choose a recipe and seed lot.", id: "Pilih resep dan lot benih." }));
    let created = "";
    if (await action.run(async () => { created = await createBatch(recipe.id, chosenLot.id, notes); })) {
      void navigate({ to: "/erp/batch/$id", params: { id: created } });
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "New batch", id: "Batch baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Recipe", id: "Resep" })} hint={t({ en: "Its version is locked for this batch.", id: "Versinya dikunci untuk batch ini." })}>
          <select className={inputClass} value={recipeId} onChange={(e) => { setRecipeId(e.target.value); setLotId(""); }}>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.code} v{r.version}</option>)}
          </select>
        </Field>
        <Field label={t({ en: "Seed lot", id: "Lot benih" })}>
          <select className={inputClass} value={chosenLot?.id ?? ""} onChange={(e) => setLotId(e.target.value)} disabled={usable.length === 0}>
            {usable.length === 0 && <option value="">{t({ en: "No lots for this crop", id: "Belum ada lot untuk tanaman ini" })}</option>}
            {usable.map((l) => <option key={l.id} value={l.id}>{l.lot_no} · {cropLabel({ name: l.crop_name, variety: l.crop_variety })} · {t({ en: "left", id: "sisa" })} {l.qty_on_hand.toLocaleString(lang === "id" ? localeOf(lang) : "en-GB")} {l.unit}</option>)}
          </select>
        </Field>
        {usable.length === 0 && <Note>{t({ en: "Add a lot for this crop on the page", id: "Tambahkan lot untuk tanaman ini di halaman" })} <Link to="/erp/seed-lots" className="font-medium text-[#0B6477] hover:underline">{t({ en: "Seed lots", id: "Lot benih" })}</Link>.</Note>}
        <Field label={t({ en: "Notes", id: "Catatan" })}><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy || !chosenLot}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Create batch", id: "Buat batch" })}</PrimaryButton>
          <SecondaryButton onClick={onDone}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
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
  const t = useT();
  return (
    <div className="rounded-lg border border-[#E3ECED] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-medium text-[#0F2F36]">{t({ en: "Rack", id: "Rak" })} {rack} · Tier {tier}</span>
        {canOperate && !asking && <SecondaryButton onClick={() => setAsking(true)}>{t({ en: "Mark as clean", id: "Tandai bersih" })}</SecondaryButton>}
        {canOperate && asking && (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[#4F6B73]">{t({ en: "Is it clean?", id: "Sudah bersih?" })}</span>
            <SecondaryButton
              disabled={action.busy}
              onClick={() => void action.run(async () => {
                await tierSanitized(store.locationIds.get(code) ?? "");
                await store.load();
              })}
            >
              {action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Yes, it is", id: "Ya, sudah" })}
            </SecondaryButton>
            <SecondaryButton disabled={action.busy} onClick={() => setAsking(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
          </span>
        )}
      </div>
      <div className="mt-1 empty:hidden"><ActionNote action={action} /></div>
    </div>
  );
}

function SanitationCard({ canOperate }: { canOperate: boolean }) {
  const store = useErpStore();
  const t = useT();
  const tiers = store.mode === "sample" ? [] : store.tiersInSanitation();
  if (tiers.length === 0) return null;
  return (
    <Card className="p-4">
      <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "Waiting for sanitation", id: "Menunggu sanitasi" })}</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">{t({ en: "This tier takes a batch only after it is marked clean.", id: "Tier ini baru menerima batch setelah ditandai bersih." })}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tiers.map((tr) => <SanitationRow key={tr.code} rack={tr.rack} tier={tr.tier} code={tr.code} canOperate={canOperate} />)}
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
  const t = useT();
  const lang = useLang();

  const noRecipe = state.data !== null && state.data.recipes.length === 0;

  return (
    <ErpPage
      eyebrow={t({ en: "Growing", id: "Budidaya" })}
      title="Batch"
      sub={t({ en: "A batch runs from sowing in the chamber to harvest in the plant factory.", id: "Satu batch berjalan dari semai di chamber sampai panen di plant factory." })}
      actions={canManageProduction && !creating && state.data !== null && !noRecipe ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t({ en: "New batch", id: "Batch baru" })}</PrimaryButton> : undefined}
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
                {!canOperate && <ReadOnlyNote who={t({ en: "Operator or Production manager", id: "Operator atau Manajer produksi" })} />}
                {canManageProduction && noRecipe && (
                  <Note>{t({ en: "A batch uses an active recipe. Activate one first on the page", id: "Batch memakai resep aktif. Aktifkan dulu satu resep di halaman" })} <Link to="/erp/recipes" className="font-medium text-[#0B6477] hover:underline">{t({ en: "Recipes", id: "Resep" })}</Link>.</Note>
                )}
                <SanitationCard canOperate={canOperate} />
                <DataTable
                  rows={[...active].sort((a, b) => harvestOn(a).localeCompare(harvestOn(b))).concat(closed)}
                  rowKey={(b) => b.id}
                  noun={t({ en: "batches", id: "batch" })}
                  rowLink={(b) => `/erp/batch/${b.id}`}
                  searchText={(b) => `${b.code} ${batchLabel(b)} ${b.recipe_code} ${b.seed_lot_no}`}
                  searchLabel={t({ en: "Search by batch, crop, recipe or lot", id: "Cari batch, tanaman, resep, atau lot" })}
                  initialPill="active"
                  pills={[
                    { key: "active", label: t({ en: "Active", id: "Aktif" }), dot: "#14919B", match: (b) => b.status === "direncanakan" || b.status === "berjalan" },
                    { key: "closed", label: t({ en: "Closed", id: "Ditutup" }), dot: "#8FA3A8", match: (b) => b.status === "selesai" || b.status === "gagal" },
                  ]}
                  filters={[{ label: t({ en: "Filter by crop", id: "Filter tanaman" }), all: t({ en: "All crops", id: "Semua tanaman" }), value: (b) => batchLabel(b) }]}
                  empty={t({ en: "No batches yet.", id: "Belum ada batch." })}
                  columns={[
                    { key: "code", label: "Batch", track: "minmax(0,1.3fr)", phone: "title", sort: (a, b) => a.code.localeCompare(b.code), cell: (b) => <CellTitle title={b.code} sub={batchLabel(b)} /> },
                    { key: "stage", label: t({ en: "Stage", id: "Tahap" }), sort: (a, b) => a.status.localeCompare(b.status), cell: (b) => b.status === "direncanakan" || b.status === "berjalan" ? <Chip label={batchStage(b, today, lang)} className={BATCH_STATUS[b.status].className} /> : <Chip label={batchStatusLabel(b.status, lang)} className={BATCH_STATUS[b.status].className} /> },
                    { key: "recipe", label: t({ en: "Recipe and lot", id: "Resep dan lot" }), phone: "hidden", cell: (b) => <span className="block truncate text-[13px]">{b.recipe_code} v{b.recipe_version} · lot {b.seed_lot_no}</span> },
                    { key: "germination", label: t({ en: "Germination", id: "Kecambah" }), track: "110px", align: "right", sort: (a, b) => germinationRate(a) - germinationRate(b), cell: (b) => <span className="tabular-nums">{b.seeds > 0 ? `${Math.round(germinationRate(b) * 100)}%` : "-"}</span> },
                    { key: "plants", label: t({ en: "Plants", id: "Tanaman" }), track: "90px", align: "right", sort: (a, b) => a.plants_now - b.plants_now, cell: (b) => <span className="tabular-nums">{b.plants_now || "-"}</span> },
                    { key: "harvest", label: t({ en: "Harvest", id: "Panen" }), track: "100px", align: "right", sort: (a, b) => a.harvested_kg - b.harvested_kg, cell: (b) => <span className="tabular-nums">{b.harvested_kg > 0 ? `${b.harvested_kg.toLocaleString(lang === "id" ? localeOf(lang) : "en-GB")} kg` : "-"}</span> },
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
