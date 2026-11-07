import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  LEVEL_LABELS,
  SLOT_STATUSES,
  buildLocationTree,
  fetchLocations,
  isSlot,
  slotCoverage,
  slotsUnder,
  updateSlotStatus,
  type LocationNode,
  type SlotStatus,
} from "../../lib/pf/foundation";
import { ActionNote, DataState, ErpPage, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// The tree of places. Its codes are fixed, since they link to the 3D models; what
// an admin changes here is whether a hole or tray position can be used.

const MAX_BULK = 80;

const statusOf = (key: SlotStatus | null) => SLOT_STATUSES.find((s) => s.key === key);

function TreeRow({ node, depth, selected, open, onToggle, onSelect }: {
  node: LocationNode;
  depth: number;
  selected: string | null;
  open: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  // The slots themselves are drawn as a grid in the detail panel.
  const branches = node.children.filter((c) => !isSlot(c));
  const isOpen = open.has(node.id);
  return (
    <>
      <div className={`flex items-center rounded-lg ${selected === node.id ? "bg-[#E3F7F0]" : "hover:bg-[#F3F7F7]"}`} style={{ paddingLeft: depth * 14 }}>
        {branches.length > 0 ? (
          <button type="button" onClick={() => onToggle(node.id)} className="grid h-11 w-9 shrink-0 place-items-center text-[#4F6B73] sm:h-8 sm:w-8" aria-label={isOpen ? `Close ${node.code}` : `Open ${node.code}`} aria-expanded={isOpen}>
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}
        <button type="button" onClick={() => onSelect(node.id)} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left sm:min-h-0">
          <span className="whitespace-nowrap text-[14px] font-medium text-[#0F2F36]">{node.code}</span>
          <span className="truncate text-[13px] text-[#4F6B73]">{node.name}</span>
        </button>
      </div>
      {isOpen && branches.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} selected={selected} open={open} onToggle={onToggle} onSelect={onSelect} />)}
    </>
  );
}

function StatusLegend({ slots }: { slots: LocationNode[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#36525A]">
      {SLOT_STATUSES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
          {s.label} <span className="font-medium">{slots.filter((n) => n.slot_status === s.key).length}</span>
        </span>
      ))}
    </div>
  );
}

function Detail({ node, canEdit, onChanged }: { node: LocationNode; canEdit: boolean; onChanged: () => Promise<void> }) {
  const slots = useMemo(() => slotsUnder(node), [node]);
  const [picked, setPicked] = useState<string | null>(null);
  const action = useAction();
  // Children of a gully or shelf are few enough to pick one by one.
  const grid = node.children.length > 0 && node.children.every(isSlot);
  const current = grid ? node.children.find((c) => c.id === picked) : isSlot(node) ? node : undefined;
  // One click may change a tier at most, so a slip cannot take a whole room offline.
  const targets = current ? [current] : slots.length <= MAX_BULK ? slots : [];

  const setStatus = async (status: SlotStatus) => {
    if (await action.run(() => updateSlotStatus(targets.map((t) => t.id), status))) await onChanged();
  };

  return (
    <Card className="p-4">
      <p className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477]">{LEVEL_LABELS[node.level]}</p>
      <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-[#0F2F36]">{node.code}</h2>
      <p className="mb-3 text-[14px] text-[#4F6B73]">{node.name}{node.capacity != null && !isSlot(node) ? ` · capacity ${node.capacity}` : ""}</p>

      {slots.length > 1 && <StatusLegend slots={slots} />}

      {grid && (
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {node.children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPicked(picked === c.id ? null : c.id)}
              title={`${c.code} · ${statusOf(c.slot_status)?.label ?? ""}`}
              aria-pressed={picked === c.id}
              className={`rounded-md border py-1.5 text-center text-[12.5px] font-medium text-[#0F2F36] ${picked === c.id ? "border-[#0B6477] bg-[#E3F7F0]" : "border-[#E3ECED] hover:border-[#14919B]"}`}
            >
              <span className="mx-auto mb-0.5 block h-1.5 w-1.5 rounded-full" style={{ background: statusOf(c.slot_status)?.color }} />
              {c.code.slice(-2)}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
          <span className="font-medium text-[#0F2F36]">{current.code}</span>
          <span className="text-[#4F6B73]">{statusOf(current.slot_status)?.label}</span>
          {current.level === "hole" ? (
            <Link to="/erp/plant-factory" search={{ hole: current.code }} className="flex items-center gap-1 font-medium text-[#0B6477] hover:underline">
              View in 3D <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link to="/erp/seedlings" search={{ slot: current.code }} className="flex items-center gap-1 font-medium text-[#0B6477] hover:underline">
              View in 3D <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {canEdit && targets.length === 0 && (
        <p className="mt-3 text-[13px] text-[#4F6B73]">Choose a tier, gully or chamber shelf to change its status.</p>
      )}

      {canEdit && targets.length > 0 && (
        <div className="mt-4 border-t border-[#E3ECED] pt-3">
          <p className="mb-2 text-[13px] font-medium text-[#36525A]">
            Change status {targets.length === 1 ? targets[0].code : `${targets.length} positions in ${node.code}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {SLOT_STATUSES.map((s) => (
              <SecondaryButton key={s.key} disabled={action.busy} onClick={() => void setStatus(s.key)}>
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
              </SecondaryButton>
            ))}
          </div>
          <div className="mt-2"><ActionNote action={action} /></div>
        </div>
      )}
    </Card>
  );
}

function matches(node: LocationNode, q: string): LocationNode | undefined {
  if (node.code.toLowerCase() === q) return node;
  for (const c of node.children) {
    const found = matches(c, q);
    if (found) return found;
  }
  return undefined;
}

function ancestors(rows: LocationNode[], id: string, path: string[] = []): string[] | null {
  for (const n of rows) {
    if (n.id === id) return path;
    const found = ancestors(n.children, id, [...path, n.id]);
    if (found) return found;
  }
  return null;
}

export default function LocationsPage() {
  const state = useLoad(fetchLocations);
  const { canAdmin } = useErpAccess();
  const tree = useMemo(() => buildLocationTree(state.data ?? []), [state.data]);
  const coverage = useMemo(() => slotCoverage(state.data ?? []), [state.data]);
  const [selected, setSelected] = useState<string | null>(null);
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState(false);

  // The first two levels start open, so the page opens on rooms and racks.
  const open = useMemo(() => {
    const start = tree.flatMap((n) => [n.id, ...n.children.map((c) => c.id)]);
    const set = new Set(start);
    for (const id of toggled) {
      if (set.has(id)) set.delete(id);
      else set.add(id);
    }
    return set;
  }, [tree, toggled]);

  const toggle = (id: string) =>
    setToggled((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reveal = (id: string) => {
    const path = ancestors(tree, id) ?? [];
    setToggled((t) => {
      const next = new Set(t);
      for (const a of path) if (!open.has(a)) next.add(a);
      return next;
    });
    setSelected(id);
  };

  const find = () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const hit = tree.map((n) => matches(n, q)).find(Boolean);
    setNotFound(!hit);
    if (hit) {
      // A slot shows inside its gully or shelf, where it can be picked.
      const parent = isSlot(hit) ? hit.parent_id : null;
      reveal(parent ?? hit.id);
    }
  };

  const node = useMemo(() => {
    const walk = (list: LocationNode[]): LocationNode | undefined => {
      for (const n of list) {
        if (n.id === selected) return n;
        const c = walk(n.children);
        if (c) return c;
      }
      return undefined;
    };
    return walk(tree) ?? tree[0];
  }, [tree, selected]);

  return (
    <ErpPage eyebrow="Master data" title="Location" sub="Every place in one tree. The codes match the 3D model and cannot be changed.">
      <DataState state={state}>
        {() => (
          <div className="space-y-4">
            {coverage.missing.length === 0 ? (
              <Note>All {coverage.expected} holes and tray positions already have a code.</Note>
            ) : (
              <Note tone="warn">{coverage.missing.length} codes are missing, among them {coverage.missing.slice(0, 3).join(", ")}. Run pf-foundation.sql again.</Note>
            )}
            {!canAdmin && <ReadOnlyNote who="System admin" />}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
              <Card className="p-3">
                <form className="mb-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); find(); }}>
                  <input className={inputClass} value={search} onChange={(e) => { setSearch(e.target.value); setNotFound(false); }} placeholder="Search a code, e.g. R1-T2-G3" aria-label="Search location code" />
                  <SecondaryButton type="submit">Search</SecondaryButton>
                </form>
                {notFound && <div className="mb-2"><Note tone="warn">That code was not found.</Note></div>}
                {tree.map((n) => <TreeRow key={n.id} node={n} depth={0} selected={node?.id ?? null} open={open} onToggle={toggle} onSelect={setSelected} />)}
              </Card>
              {node && <Detail key={node.id} node={node} canEdit={canAdmin} onChanged={state.reload} />}
            </div>
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}
