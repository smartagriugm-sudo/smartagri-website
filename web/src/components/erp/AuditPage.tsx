import { useMemo, useState } from "react";
import {
  AUDIT_ACTIONS,
  AUDIT_PAGE,
  AUDIT_TABLES,
  auditChanges,
  auditSubject,
  fetchAudit,
  fetchMembers,
  memberName,
  type AuditEntry,
} from "../../lib/pf/foundation";
import { DataState, ErpPage, formatDateTime, inputClass, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Read-only record of who changed what. Database triggers write it, so nothing on
// this page or any other can add to it or remove from it.

const tableLabel = (t: string) => AUDIT_TABLES.find((x) => x.key === t)?.label ?? t;

const show = (v: unknown) => (v === null || v === undefined ? "kosong" : typeof v === "object" ? JSON.stringify(v) : String(v));

function Row({ entry, actor }: { entry: AuditEntry; actor: string }) {
  const [open, setOpen] = useState(false);
  const changes = useMemo(() => auditChanges(entry), [entry]);
  return (
    <div className="border-t border-[#E3ECED] py-2.5 first:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid w-full gap-x-3 gap-y-0.5 text-left text-[14px] sm:grid-cols-[170px_140px_1fr_auto]">
        <span className="text-[#6B8289]">{formatDateTime(entry.at)}</span>
        <span className="text-[#0F2F36]">{actor}</span>
        <span className="min-w-0 text-[#0F2F36]">
          <span className="font-medium">{AUDIT_ACTIONS[entry.action]}</span> {tableLabel(entry.table_name).toLowerCase()} <span className="break-all">{auditSubject(entry)}</span>
        </span>
        <span className="text-[13px] font-medium text-[#14919B]">{open ? "Tutup" : `${changes.length} kolom`}</span>
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
      eyebrow="Pengaturan"
      title="Audit log"
      sub={`Siapa mengubah apa dan kapan. Menampilkan ${AUDIT_PAGE} perubahan terakhir.`}
      actions={
        <select className={`${inputClass} w-auto`} value={table} onChange={(e) => setTable(e.target.value)} aria-label="Saring menurut data">
          <option value="">Semua data</option>
          {AUDIT_TABLES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      }
    >
      {!canReadAudit && <div className="mb-3"><Note tone="warn">Audit log hanya bisa dibaca Admin sistem dan Pimpinan.</Note></div>}
      <DataState state={entries}>
        {(list) => (
          <Card className="px-4 py-2">
            {list.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[#4F6B73]">Belum ada perubahan yang tercatat.</p>
            ) : (
              list.map((e) => <Row key={e.id} entry={e} actor={e.actor_id ? names.get(e.actor_id) ?? "Anggota lain" : "Sistem"} />)
            )}
          </Card>
        )}
      </DataState>
    </ErpPage>
  );
}
