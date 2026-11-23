import { useMemo, useState } from "react";
import {
  AUDIT_PAGE,
  AUDIT_TABLES,
  auditActionLabel,
  auditChanges,
  auditNoun,
  auditSubject,
  auditTableLabel,
  fetchAudit,
  fetchMembers,
  groupAudit,
  memberName,
  type AuditEntry,
} from "../../lib/pf/foundation";
import { useLang, useT } from "../../lib/i18n";
import { DataState, ErpPage, formatDateTime, inputClass, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Read-only record of who changed what. Database triggers write it, so nothing on
// this page or any other can add to it or remove from it.

const show = (v: unknown, empty: string) => (v === null || v === undefined ? empty : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Many rows from one operation: the count first, each one's change on opening it. */
function GroupRow({ entries, actor }: { entries: AuditEntry[]; actor: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const lang = useLang();
  const first = entries[0];
  return (
    <div className="border-t border-[#E3ECED] py-2.5 first:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid min-h-[44px] w-full gap-x-3 gap-y-0.5 text-left text-[14px] sm:min-h-[24px] sm:grid-cols-[170px_140px_1fr_auto]">
        <span className="text-[#4F6B73]">{formatDateTime(first.at, lang)}</span>
        <span className="text-[#0F2F36]">{actor}</span>
        <span className="min-w-0 text-[#0F2F36]"><span className="font-medium">{auditActionLabel(first.action, lang)}</span> {entries.length} {auditNoun(first.table_name, entries.length, lang)}</span>
        <span className="text-[13px] font-medium text-[#0B6477]">{open ? t({ en: "Close", id: "Tutup" }) : t({ en: "Details", id: "Detail" })}</span>
      </button>
      {open && <div className="mt-2 rounded-lg border border-[#E3ECED] px-3">{entries.map((e) => <Row key={e.id} entry={e} actor={actor} />)}</div>}
    </div>
  );
}

function Row({ entry, actor }: { entry: AuditEntry; actor: string }) {
  const [open, setOpen] = useState(false);
  const changes = useMemo(() => auditChanges(entry), [entry]);
  const t = useT();
  const lang = useLang();
  const empty = t({ en: "empty", id: "kosong" });
  return (
    <div className="border-t border-[#E3ECED] py-2.5 first:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid min-h-[44px] w-full gap-x-3 gap-y-0.5 text-left text-[14px] sm:min-h-[24px] sm:grid-cols-[170px_140px_1fr_auto]">
        <span className="text-[#4F6B73]">{formatDateTime(entry.at, lang)}</span>
        <span className="text-[#0F2F36]">{actor}</span>
        <span className="min-w-0 text-[#0F2F36]">
          <span className="font-medium">{auditActionLabel(entry.action, lang)}</span> {auditNoun(entry.table_name, 1, lang)} <span className="break-all">{auditSubject(entry, lang)}</span>
        </span>
        <span className="text-[13px] font-medium text-[#0B6477]">{open ? t({ en: "Close", id: "Tutup" }) : t({ en: `${changes.length} ${changes.length === 1 ? "field" : "fields"}`, id: `${changes.length} kolom` })}</span>
      </button>
      {open && (
        <dl className="mt-2 space-y-1 rounded-lg bg-[#F3F7F7] p-3 text-[13px]">
          {changes.map((c) => (
            <div key={c.field} className="grid gap-x-3 sm:grid-cols-[170px_1fr]">
              <dt className="font-medium text-[#36525A]">{c.field}</dt>
              <dd className="break-all text-[#4F6B73]">{show(c.from, empty)} → <span className="text-[#0F2F36]">{show(c.to, empty)}</span></dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AuditPage() {
  const { canReadAudit } = useErpAccess();
  const t = useT();
  const lang = useLang();
  const [table, setTable] = useState("");
  const entries = useLoad(() => fetchAudit(table || null), [table]);
  const members = useLoad(fetchMembers);
  const names = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, memberName(m)])), [members.data]);

  return (
    <ErpPage
      eyebrow={t({ en: "Administration", id: "Administrasi" })}
      title={t({ en: "Audit log", id: "Log audit" })}
      sub={t({ en: `Who changed what and when. Showing the last ${AUDIT_PAGE} latest changes.`, id: `Siapa mengubah apa dan kapan. Menampilkan ${AUDIT_PAGE} perubahan terbaru.` })}
      actions={
        <select className={`${inputClass} w-auto`} value={table} onChange={(e) => setTable(e.target.value)} aria-label={t({ en: "Filter by data", id: "Filter data" })}>
          <option value="">{t({ en: "All data", id: "Semua data" })}</option>
          {AUDIT_TABLES.map((o) => <option key={o.key} value={o.key}>{auditTableLabel(o.key, lang)}</option>)}
        </select>
      }
    >
      {!canReadAudit && <div className="mb-3"><Note tone="warn">{t({ en: "The audit log can only be read by System admins and Leadership.", id: "Log audit hanya bisa dibaca Admin sistem dan Pimpinan." })}</Note></div>}
      <DataState state={entries}>
        {(list) => (
          <Card className="px-4 py-2">
            {list.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[#4F6B73]">{t({ en: "No changes recorded yet.", id: "Belum ada perubahan tercatat." })}</p>
            ) : (
              groupAudit(list).map(({ key, entries: group }) => {
                const actor = group[0].actor_id ? names.get(group[0].actor_id) ?? t({ en: "Another member", id: "Anggota lain" }) : t({ en: "System", id: "Sistem" });
                return group.length > 1 ? <GroupRow key={key} entries={group} actor={actor} /> : <Row key={key} entry={group[0]} actor={actor} />;
              })
            )}
          </Card>
        )}
      </DataState>
    </ErpPage>
  );
}
