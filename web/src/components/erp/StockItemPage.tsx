import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { compressProductPhoto, fetchItems, fetchStockLots, itemPhotoLinks, setItemPhoto } from "../../lib/pf/inventory";
import { ActionNote, DataState, ErpPage, SecondaryButton, useAction, useErpAccess, useLoad } from "./page";
import { ItemDetail, ItemEditor, ItemPhoto } from "./StockPage";
import { Note } from "./ui";

// One item, laid out like an instrument on the main site's inventory: its photo stays
// beside the page, and the lots, use and history run down the other side.

export default function StockItemPage({ id }: { id: string }) {
  const state = useLoad(async () => {
    const [items, lots] = await Promise.all([fetchItems(), fetchStockLots()]);
    const item = items.find((i) => i.id === id) ?? null;
    const photos = await itemPhotoLinks(item?.photo_path ? [item.photo_path] : []);
    return { item, lots: lots.filter((l) => l.item_id === id), photo: item?.photo_path ? photos.get(item.photo_path) ?? null : null };
  }, [id]);
  const { canManageProduction, canOperate } = useErpAccess();
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const photoAction = useAction();

  const upload = async (file: File) => {
    const item = state.data?.item;
    if (!item) return;
    await photoAction.run(async () => {
      await setItemPhoto(item.id, await compressProductPhoto(file), item.photo_path);
      await state.reload();
    });
    if (input.current) input.current.value = "";
  };
  const remove = async () => {
    const item = state.data?.item;
    if (!item) return;
    await photoAction.run(async () => {
      await setItemPhoto(item.id, null, item.photo_path);
      await state.reload();
    });
  };

  const back = <Link to="/erp/stock" className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> All stock</Link>;

  return (
    <ErpPage eyebrow="Inventory" title={state.data?.item?.name ?? "Item"} actions={back}>
      <DataState state={state}>
        {({ item, lots, photo }) => {
          if (!item) return <Note>This item could not be found.</Note>;
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-2 lg:sticky lg:top-20">
                <ItemPhoto item={item} url={photo} className="aspect-square w-full rounded-2xl bg-white" />
                {canManageProduction && (
                  <>
                    <input ref={input} type="file" accept="image/*" className="sr-only" aria-label="Product photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton disabled={photoAction.busy} onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> {photoAction.busy ? "Saving…" : item.photo_path ? "Change photo" : "Add photo"}</SecondaryButton>
                      {item.photo_path && <SecondaryButton disabled={photoAction.busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" /> Remove</SecondaryButton>}
                    </div>
                    <ActionNote action={photoAction} />
                  </>
                )}
              </div>
              <div className="min-w-0">
                {editing ? (
                  <ItemEditor key={item.id} item={item} onDone={(saved) => { setEditing(false); if (saved) void state.reload(); }} />
                ) : (
                  <ItemDetail key={item.id} item={item} lots={lots} canManage={canManageProduction} canUse={canOperate} onEdit={() => setEditing(true)} reload={state.reload} />
                )}
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
