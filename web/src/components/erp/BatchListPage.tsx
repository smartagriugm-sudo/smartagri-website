import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { addDays } from "../../lib/pf/facility";
import { BATCH_STATUS, batchLabel, batchStage, createBatch, fetchActiveRecipes, fetchBatches, fetchSeedLots, germinationRate, isLotUsable, jakartaToday, tierSanitized, type ActiveRecipe, type BatchOverview, type SeedLot } from "../../lib/pf/batch";
import { cropLabel } from "../../lib/pf/foundation";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note, Segmented } from "./ui";

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
    if (!recipe || !chosenLot) return action.setError("Pilih resep dan lot benih.");
    let created = "";
    if (await action.run(async () => { created = await createBatch(recipe.id, chosenLot.id, notes); })) {
      void navigate({ to: "/erp/batch/$id", params: { id: created } });
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Batch baru</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Resep" hint="Versinya terkunci untuk batch ini.">
          <select className={inputClass} value={recipeId} onChange={(e) => { setRecipeId(e.target.value); setLotId(""); }}>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.code} v{r.version}</option>)}
          </select>
        </Field>
        <Field label="Lot benih">
          <select className={inputClass} value={chosenLot?.id ?? ""} onChange={(e) => setLotId(e.target.value)} disabled={usable.length === 0}>
            {usable.length === 0 && <option value="">Tidak ada lot untuk tanaman ini</option>}
            {usable.map((l) => <option key={l.id} value={l.id}>{l.lot_no} · {cropLabel({ name: l.crop_name, variety: l.crop_variety })} · sisa {l.qty_on_hand.toLocaleString("id-ID")} {l.unit}</option>)}
          </select>
        </Field>
        {usable.length === 0 && <Note>Tambahkan lot untuk tanaman ini di halaman <Link to="/erp/benih" className="font-medium text-[#0B6477] hover:underline">Lot benih</Link>.</Note>}
        <Field label="Catatan"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy || !chosenLot}>{action.busy ? "Menyimpan..." : "Buat batch"}</PrimaryButton>
          <SecondaryButton onClick={onDone}>Batal</SecondaryButton>
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
        <span className="text-[14px] font-medium text-[#0F2F36]">Rak {rack} · Tingkat {tier}</span>
        {canOperate && !asking && <SecondaryButton onClick={() => setAsking(true)}>Tandai bersih</SecondaryButton>}
        {canOperate && asking && (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[#4F6B73]">Sudah bersih?</span>
            <SecondaryButton
              disabled={action.busy}
              onClick={() => void action.run(async () => {
                await tierSanitized(store.locationIds.get(code) ?? "");
                await store.load();
              })}
            >
              {action.busy ? "Menyimpan..." : "Ya, sudah"}
            </SecondaryButton>
            <SecondaryButton disabled={action.busy} onClick={() => setAsking(false)}>Batal</SecondaryButton>
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
      <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Menunggu sanitasi</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">Tingkat ini baru menerima batch setelah ditandai bersih.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tiers.map((t) => <SanitationRow key={t.code} rack={t.rack} tier={t.tier} code={t.code} canOperate={canOperate} />)}
      </div>
    </Card>
  );
}

type Show = "aktif" | "selesai";

export default function BatchListPage() {
  const state = useLoad(async () => {
    const [batches, recipes, lots] = await Promise.all([fetchBatches(), fetchActiveRecipes(), fetchSeedLots()]);
    return { batches, recipes, lots };
  });
  const { canManageProduction, canOperate } = useErpAccess();
  const [creating, setCreating] = useState(false);
  const [show, setShow] = useState<Show>("aktif");
  const today = jakartaToday();

  const noRecipe = state.data !== null && state.data.recipes.length === 0;

  return (
    <ErpPage
      eyebrow="Budidaya"
      title="Batch"
      sub="Satu batch berjalan dari semai di chamber sampai panen di plant factory."
      actions={canManageProduction && !creating && state.data !== null && !noRecipe ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Batch baru</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ batches, recipes, lots }) => {
          const active = batches.filter((b) => b.status === "direncanakan" || b.status === "berjalan");
          const closed = batches.filter((b) => b.status === "selesai" || b.status === "gagal");
          // Nearest harvest first, batches not sown yet last.
          const harvestOn = (b: BatchOverview) => (b.sown_at ? addDays(b.sown_at, b.cycle_days) : "9999");
          const list = show === "aktif" ? [...active].sort((a, b) => harvestOn(a).localeCompare(harvestOn(b))) : closed;
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${creating ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canOperate && <ReadOnlyNote who="Operator atau Manajer produksi" />}
                {canManageProduction && noRecipe && (
                  <Note>Batch memakai resep aktif. Aktifkan resep dulu di halaman <Link to="/erp/resep" className="font-medium text-[#0B6477] hover:underline">Resep</Link>.</Note>
                )}
                <SanitationCard canOperate={canOperate} />
                <Segmented label="Tampilkan" value={show} options={[{ key: "aktif", label: `Aktif (${active.length})` }, { key: "selesai", label: `Ditutup (${closed.length})` }]} onChange={setShow} />
                {list.length === 0 ? (
                  <Card className="p-4"><p className="py-6 text-center text-[14px] text-[#4F6B73]">{show === "aktif" ? "Belum ada batch aktif." : "Belum ada batch yang ditutup."}</p></Card>
                ) : (
                  <Card>
                    <ul>
                      {list.map((b) => (
                        <li key={b.id} className="border-t border-[#EDF2F2] first:border-0">
                          <Link to="/erp/batch/$id" params={{ id: b.id }} className="grid items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 hover:bg-[#F6F8F8] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_16px]">
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-x-2 text-[15px] font-medium text-[#0F2F36]">
                                {b.code}
                                {show === "selesai" && <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-medium ${BATCH_STATUS[b.status].className}`}>{BATCH_STATUS[b.status].label}</span>}
                              </span>
                              <span className="block truncate text-[13.5px] text-[#36525A]">{batchLabel(b)}</span>
                            </span>
                            <span className="min-w-0">
                              {show === "aktif" && <span className="block text-[13.5px] text-[#0F2F36]">{batchStage(b, today)}</span>}
                              <span className="block truncate text-[13px] text-[#4F6B73]">{b.recipe_code} v{b.recipe_version} · lot {b.seed_lot_no}</span>
                            </span>
                            <span className="block text-[13px] text-[#4F6B73]">
                              {[
                                b.seeds > 0 ? `kecambah ${Math.round(germinationRate(b) * 100)}%` : null,
                                b.plants_now > 0 ? `${b.plants_now} tanaman` : null,
                                b.harvested_kg > 0 ? `panen ${b.harvested_kg.toLocaleString("id-ID")} kg` : null,
                              ].filter(Boolean).join(" · ") || "-"}
                            </span>
                            <ArrowRight className="hidden h-4 w-4 text-[#0B6477] md:block" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
              {creating && <NewBatch recipes={recipes} lots={lots} onDone={() => setCreating(false)} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
