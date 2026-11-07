import { useMemo, useState } from "react";
import {
  AUDIT_ACTIONS,
  AUDIT_PAGE,
  AUDIT_TABLES,
  auditChanges,
  auditSubject,
  fetchAudit,
  fetchMembers,
  groupAudit,
  memberName,
  type AuditEntry,
} from "../../lib/pf/foundation";
import { DataState, ErpPage, formatDateTime, inputClass, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Read-only record of who changed what. Database triggers write it, so nothing on
// this page or any other can add to it or remove from it.

const tableLabel = (t: string) => AUDIT_TABLES.find((x) => x.key === t)?.label ?? t;

const show = (v: unknown) => (v === null || v === undefined ? "kosong" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Many rows from one operation: the count first, each one's change on opening it. */
function GroupRow({ entries, actor }: { entries: AuditEntry[]; actor: string }) {
  const [open, setOpen] = useState(false);
  const first = entries[0];
  return (
    <div className="border-t border-[#E3ECED] py-2.5 first:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid min-h-[44px] w-full gap-x-3 gap-y-0.5 text-left text-[14px] sm:min-h-[24px] sm:grid-cols-[170px_140px_1fr_auto]">
        <span className="text-[#4F6B73]">{formatDateTime(first.at)}</span>
        <span className="text-[#0F2F36]">{actor}</span>
        <span className="min-w-0 text-[#0F2F36]"><span className="font-medium">{AUDIT_ACTIONS[first.action]}</span> {entries.length} {tableLabel(first.table_name).toLowerCase()}</span>
        <span className="text-[13px] font-medium text-[#0B6477]">{open ? "Close" : "Details"}</span>
      </button>
      {open && <div className="mt-2 rounded-lg border border-[#E3ECED] px-3">{entries.map((e) => <Row key={e.id} entry={e} actor={actor} />)}</div>}
    </div>
  );
}

function Row({ entry, actor }: { entry: AuditEntry; actor: string }) {
  const [open, setOpen] = useState(false);
  const changes = useMemo(() => auditChanges(entry), [entry]);
  return (
    <div className="border-t border-[#E3ECED] py-2.5 first:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid min-h-[44px] w-full gap-x-3 gap-y-0.5 text-left text-[14px] sm:min-h-[24px] sm:grid-cols-[170px_140px_1fr_auto]">
        <span className="text-[#4F6B73]">{formatDateTime(entry.at)}</span>
        <span className="text-[#0F2F36]">{actor}</span>
        <span className="min-w-0 text-[#0F2F36]">
          <span className="font-medium">{AUDIT_ACTIONS[entry.action]}</span> {tableLabel(entry.table_name).toLowerCase()} <span className="break-all">{auditSubject(entry)}</span>
        </span>
        <span className="text-[13px] font-medium text-[#0B6477]">{open ? "Close" : `${changes.length} columns`}</span>
      </button>
      {open && (
        <dl className="mt-2 space-y-1 rounded-lg bg-[#F3F7F7] p-3 text-[13px]">
          {changes.map((c) => (
            <div key={c.field} className="grid gap-x-3 sm:grid-cols-[170px_1fr]">
              <dt className="font-medium text-[#36525A]">{c.field}</dt>
              <dd className="break-all text-[#4F6B73]">{show(c.from)} → <span className="text-[#0F2F36]">{show(c.to)}</span></dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AuditPage() {
  const { canReadAudit } = useErpAccess();
  const [table, setTable] = useState("");
  const entries = useLoad(() => fetchAudit(table || null), [table]);
  const members = useLoad(fetchMembers);
  const names = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, memberName(m)])), [members.data]);

  return (
    <ErpPage
      eyebrow="Administration"
      title="Audit log"
      sub={`Who changed what and when. Showing the last ${AUDIT_PAGE} latest changes.`}
      actions={
        <select className={`${inputClass} w-auto`} value={table} onChange={(e) => setTable(e.target.value)} aria-label="Filter by data">
          <option value="">All data</option>
          {AUDIT_TABLES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      }
    >
      {!canReadAudit && <div className="mb-3"><Note tone="warn">The audit log can only be read by System admins and Leadership.</Note></div>}
      <DataState state={entries}>
        {(list) => (
          <Card className="px-4 py-2">
            {list.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[#4F6B73]">No changes recorded yet.</p>
            ) : (
              groupAudit(list).map(({ key, entries: group }) => {
                const actor = group[0].actor_id ? names.get(group[0].actor_id) ?? "Another member" : "System";
                return group.length > 1 ? <GroupRow key={key} entries={group} actor={actor} /> : <Row key={key} entry={group[0]} actor={actor} />;
              })
            )}
          </Card>
        )}
      </DataState>
    </ErpPage>
  );
}
