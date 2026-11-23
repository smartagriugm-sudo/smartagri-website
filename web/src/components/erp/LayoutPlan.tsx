import { SHELVES, shelfLabel, slotColor, slotStateLabel } from "../../lib/pf/chamber";
import { RACK_SPEC, holeId, stateColor } from "../../lib/pf/facility";
import { RACK_NUMBERS, TIER_NUMBERS } from "../../lib/pf/provider";
import type { ErpStore } from "../../lib/pf/store";
import { Segmented } from "./ui";
import { holeStateLabel } from "../../lib/pf/facility";
import { useLang, useT, type Bi } from "../../lib/i18n";

// The same spots as the 3D model, flat: every hole and every tray at once, nothing behind
// anything else, which suits changing many in a row. Picking a spot here selects it in the
// model too, so the two can sit side by side and be compared.

export type LayoutMode = "3d" | "2d" | "both";

export const LAYOUT_MODES: { key: LayoutMode; label: Bi }[] = [
  { key: "3d", label: { en: "3D", id: "3D" } },
  { key: "2d", label: { en: "2D plan", id: "Denah 2D" } },
  { key: "both", label: { en: "Side by side", id: "Berdampingan" } },
];

const GULLIES = Array.from({ length: RACK_SPEC.gullies }, (_, i) => i + 1);
const HOLES = Array.from({ length: RACK_SPEC.holes }, (_, i) => i + 1);

const cell = "block aspect-square min-w-0 rounded-[3px] outline-none transition-transform hover:scale-125 hover:ring-1 hover:ring-[#0F2F36]/40 focus-visible:ring-2 focus-visible:ring-[#0F2F36] motion-reduce:hover:scale-100";
const on = "ring-2 ring-[#0F2F36] ring-offset-1";

export function FactoryPlan({ store, selected, rack, tier, onPick }: { store: ErpStore; selected: string | null; rack: number; tier: number; onPick: (id: string) => void }) {
  const racks = RACK_NUMBERS.filter((r) => !rack || r === rack);
  const t = useT();
  const lang = useLang();
  return (
    <div className="space-y-4">
      {racks.map((r) => (
        <section key={r} aria-label={`Rack ${r}`}>
          <h3 className="mb-1.5 text-[14px] font-medium tracking-[-0.01em] text-[#0F2F36]">Rack {r}</h3>
          <div className="space-y-2.5">
            {[...TIER_NUMBERS].reverse().filter((n) => !tier || n === tier).map((n) => (
              <div key={n}>
                <p className="mb-1 text-[12px] text-[#4F6B73]">{t({ en: `Tier ${n}`, id: `Tingkat ${n}` })}</p>
                <div className="space-y-[3px]">
                  {GULLIES.map((g) => (
                    <div key={g} className="flex items-center gap-1.5">
                      <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-[#6B8187]">G{g}</span>
                      <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${RACK_SPEC.holes}, minmax(0, 1fr))` }}>
                        {HOLES.map((h) => {
                          const id = holeId(r, n, g, h);
                          const hole = store.pf.getHole(id);
                          if (!hole) return <span key={h} />;
                          const label = `${id}, ${holeStateLabel(hole.state, lang)}${hole.batch ? `, ${hole.batch}` : ""}`;
                          return <button key={h} type="button" title={label} aria-label={label} aria-pressed={selected === id} onClick={() => onPick(id)} className={`${cell} ${selected === id ? on : ""} ${hole.offline ? "opacity-30" : ""}`} style={{ background: stateColor(hole.state) }} />;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ChamberPlan({ store, selected, shelf, onPick }: { store: ErpStore; selected: string | null; shelf: number; onPick: (id: string) => void }) {
  const slots = [...store.chamber.slots.values()];
  const t = useT();
  const lang = useLang();
  return (
    <div className="space-y-4">
      {SHELVES.filter((s) => !shelf || s.shelf === shelf).map((s) => {
        const trays = slots.filter((x) => x.shelf === s.shelf).sort((a, b) => a.row - b.row || a.column - b.column);
        const columns = Math.max(1, ...trays.map((x) => x.column));
        const name = shelfLabel(s.shelf, lang);
        return (
          <section key={s.shelf} aria-label={name}>
            <h3 className="mb-1.5 text-[14px] font-medium tracking-[-0.01em] text-[#0F2F36]">{name}</h3>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {trays.map((x) => {
                const label = `${x.id}, ${slotStateLabel(x.state, lang)}${x.batch ? `, ${x.batch}` : ""}`;
                return (
                  <button key={x.id} type="button" title={label} aria-label={label} aria-pressed={selected === x.id} onClick={() => onPick(x.id)} className={`flex min-h-[56px] min-w-0 flex-col items-start justify-between rounded-lg border px-2 py-1.5 text-left outline-none transition-colors hover:bg-[#F3F7F7] focus-visible:ring-2 focus-visible:ring-[#0F2F36] ${selected === x.id ? "border-[#0F2F36] ring-1 ring-[#0F2F36]" : "border-[#DCE7E8]"} ${x.offline ? "opacity-40" : ""}`}>
                    <span className="flex w-full min-w-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slotColor(x.state) }} />
                      <span className="truncate text-[12px] font-medium tabular-nums text-[#0F2F36]">P{x.position}</span>
                    </span>
                    <span className="w-full truncate text-[12px] text-[#4F6B73]">{x.batch ? x.crop : t({ en: "Empty", id: "Kosong" })}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function LayoutSwitch({ value, onChange }: { value: LayoutMode; onChange: (v: LayoutMode) => void }) {
  const t = useT();
  return <Segmented label={t({ en: "Layout", id: "Layout" })} value={value} options={LAYOUT_MODES.map((m) => ({ key: m.key, label: t(m.label) }))} onChange={onChange} />;
}
