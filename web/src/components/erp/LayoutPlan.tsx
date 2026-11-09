import { SHELVES, slotColor, SLOT_STATES } from "../../lib/pf/chamber";
import { HOLE_STATES, RACK_SPEC, holeId, stateColor } from "../../lib/pf/facility";
import { RACK_NUMBERS, TIER_NUMBERS } from "../../lib/pf/provider";
import type { ErpStore } from "../../lib/pf/store";
import { Segmented } from "./ui";

// The same spots as the 3D model, flat: every hole and every tray at once, nothing behind
// anything else, which suits changing many in a row. Picking a spot here selects it in the
// model too, so the two can sit side by side and be compared.

export type LayoutMode = "3d" | "2d" | "both";

export const LAYOUT_MODES: { key: LayoutMode; label: string }[] = [
  { key: "3d", label: "3D" },
  { key: "2d", label: "2D plan" },
  { key: "both", label: "Side by side" },
];

const GULLIES = Array.from({ length: RACK_SPEC.gullies }, (_, i) => i + 1);
const HOLES = Array.from({ length: RACK_SPEC.holes }, (_, i) => i + 1);

const cell = "block aspect-square min-w-0 rounded-[3px] outline-none transition-transform hover:scale-125 hover:ring-1 hover:ring-[#0F2F36]/40 focus-visible:ring-2 focus-visible:ring-[#0F2F36] motion-reduce:hover:scale-100";
const on = "ring-2 ring-[#0F2F36] ring-offset-1";

export function FactoryPlan({ store, selected, rack, tier, onPick }: { store: ErpStore; selected: string | null; rack: number; tier: number; onPick: (id: string) => void }) {
  const racks = RACK_NUMBERS.filter((r) => !rack || r === rack);
  return (
    <div className="space-y-4">
      {racks.map((r) => (
        <section key={r} aria-label={`Rack ${r}`}>
          <h3 className="mb-1.5 text-[14px] font-medium tracking-[-0.01em] text-[#0F2F36]">Rack {r}</h3>
          <div className="space-y-2.5">
            {[...TIER_NUMBERS].reverse().filter((t) => !tier || t === tier).map((t) => (
              <div key={t}>
                <p className="mb-1 text-[12px] text-[#4F6B73]">Tier {t}</p>
                <div className="space-y-[3px]">
                  {GULLIES.map((g) => (
                    <div key={g} className="flex items-center gap-1.5">
                      <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-[#6B8187]">G{g}</span>
                      <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${RACK_SPEC.holes}, minmax(0, 1fr))` }}>
                        {HOLES.map((h) => {
                          const id = holeId(r, t, g, h);
                          const hole = store.pf.getHole(id);
                          if (!hole) return <span key={h} />;
                          const label = `${id}, ${HOLE_STATES[hole.state].label}${hole.batch ? `, ${hole.batch}` : ""}`;
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
  return (
    <div className="space-y-4">
      {SHELVES.filter((s) => !shelf || s.shelf === shelf).map((s) => {
        const trays = slots.filter((x) => x.shelf === s.shelf).sort((a, b) => a.row - b.row || a.column - b.column);
        const columns = Math.max(1, ...trays.map((t) => t.column));
        return (
          <section key={s.shelf} aria-label={s.label}>
            <h3 className="mb-1.5 text-[14px] font-medium tracking-[-0.01em] text-[#0F2F36]">{s.label}</h3>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {trays.map((t) => {
                const label = `${t.id}, ${SLOT_STATES[t.state].label}${t.batch ? `, ${t.batch}` : ""}`;
                return (
                  <button key={t.id} type="button" title={label} aria-label={label} aria-pressed={selected === t.id} onClick={() => onPick(t.id)} className={`flex min-h-[56px] min-w-0 flex-col items-start justify-between rounded-lg border px-2 py-1.5 text-left outline-none transition-colors hover:bg-[#F3F7F7] focus-visible:ring-2 focus-visible:ring-[#0F2F36] ${selected === t.id ? "border-[#0F2F36] ring-1 ring-[#0F2F36]" : "border-[#DCE7E8]"} ${t.offline ? "opacity-40" : ""}`}>
                    <span className="flex w-full min-w-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slotColor(t.state) }} />
                      <span className="truncate text-[12px] font-medium tabular-nums text-[#0F2F36]">P{t.position}</span>
                    </span>
                    <span className="w-full truncate text-[12px] text-[#4F6B73]">{t.batch ? t.crop : "Empty"}</span>
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
  return <Segmented label="Layout" value={value} options={LAYOUT_MODES} onChange={onChange} />;
}
