import { useMemo } from "react";
import { labRoleLabel } from "../../lib/account";
import { useLang, useT } from "../../lib/i18n";
import { ERP_ROLES, fetchMembers, fetchRoleGrants, memberName, roleLabel, roleNote, setRole, type ErpRole } from "../../lib/pf/foundation";
import { ActionNote, DataState, ErpPage, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Who has which ERP role. A person may hold several. Approving lab members stays
// where it is, at /account; only approved members are listed here.

export default function RolesPage() {
  const { canAdmin, canReadAudit } = useErpAccess();
  const t = useT();
  const lang = useLang();
  const state = useLoad(async () => {
    const [members, grants] = await Promise.all([fetchMembers(), fetchRoleGrants()]);
    return { members, grants };
  });
  const action = useAction();

  const held = useMemo(() => new Set((state.data?.grants ?? []).map((g) => `${g.profile_id}:${g.role}`)), [state.data]);

  const toggle = async (profileId: string, role: ErpRole, on: boolean) => {
    if (await action.run(() => setRole(profileId, role, on))) await state.reload();
  };

  return (
    <ErpPage eyebrow={t({ en: "Administration", id: "Administrasi" })} title={t({ en: "User roles", id: "Peran pengguna" })} sub={t({ en: "Roles decide who may change what. Every change is recorded in the audit log.", id: "Peran menentukan siapa boleh mengubah apa. Setiap perubahan dicatat di log audit." })}>
      <div className="mb-3 space-y-2">
        <Note>{t({ en: "Lab admins always have System admin access, even when not ticked here.", id: "Admin lab selalu punya akses Admin sistem, walau tidak dicentang di sini." })}</Note>
        {!canAdmin && <Note tone="warn">{canReadAudit ? t({ en: "You can see this list. Changing it needs the System admin role.", id: "Anda bisa melihat daftar ini. Untuk mengubahnya perlu peran Admin sistem." }) : t({ en: "The full list is for System admins and Leadership. You only see your own roles.", id: "Daftar lengkap untuk Admin sistem dan Pimpinan. Anda hanya melihat peran Anda sendiri." })}</Note>}
        <ActionNote action={action} />
      </div>
      <DataState state={state}>
        {({ members }) => (
          <>
          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <Card key={m.id} className="p-4">
                <p className="text-[14px] font-medium text-[#0F2F36]">{memberName(m)}</p>
                <p className="mb-2 text-[13px] text-[#4F6B73]">{labRoleLabel(m.lab_role, lang)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {ERP_ROLES.map((r) => {
                    const on = held.has(`${m.id}:${r.key}`);
                    return (
                      <label key={r.key} className="flex min-h-[44px] items-center gap-2.5 text-[14px] text-[#0F2F36]">
                        <input type="checkbox" checked={on} disabled={!canAdmin || action.busy} onChange={() => void toggle(m.id, r.key, !on)} className="h-5 w-5 accent-[#14919B] disabled:opacity-50" />
                        {roleLabel(r.key, lang)}
                      </label>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-x-auto p-4 md:block">
            <table className="w-full min-w-[920px] text-left text-[14px]">
              <thead className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B8187]">
                <tr>
                  <th className="sticky left-0 bg-white pb-2 pr-3 font-medium">{t({ en: "Member", id: "Anggota" })}</th>
                  {ERP_ROLES.map((r) => <th key={r.key} title={roleNote(r.key, lang)} className="px-2 pb-2 text-center font-medium">{roleLabel(r.key, lang)}</th>)}
                </tr>
              </thead>
              <tbody className="text-[#0F2F36]">
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-[#E3ECED]">
                    <td className="sticky left-0 bg-white py-2 pr-3">
                      <span className="block font-medium">{memberName(m)}</span>
                      <span className="block text-[13px] text-[#4F6B73]">{labRoleLabel(m.lab_role, lang)}</span>
                    </td>
                    {ERP_ROLES.map((r) => {
                      const on = held.has(`${m.id}:${r.key}`);
                      return (
                        <td key={r.key} className="p-0 text-center">
                          {/* The whole cell is the target, not only the box. */}
                          <label className={`flex min-h-[44px] items-center justify-center px-2 ${canAdmin ? "cursor-pointer hover:bg-[#F3F7F7]" : ""}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!canAdmin || action.busy}
                            onChange={() => void toggle(m.id, r.key, !on)}
                            aria-label={t({ en: `${roleLabel(r.key, lang)} for ${memberName(m)}`, id: `${roleLabel(r.key, lang)} untuk ${memberName(m)}` })}
                            className="h-[18px] w-[18px] accent-[#14919B] disabled:opacity-50"
                          />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          </>
        )}
      </DataState>
    </ErpPage>
  );
}
