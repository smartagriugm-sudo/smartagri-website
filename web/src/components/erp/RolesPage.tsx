import { useMemo } from "react";
import { labRoleLabel } from "../../lib/account";
import { ERP_ROLES, fetchMembers, fetchRoleGrants, memberName, setRole, type ErpRole } from "../../lib/pf/foundation";
import { DataState, ErpPage, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Who has which ERP role. A person may hold several. Approving lab members stays
// where it is, at /account; only approved members are listed here.

export default function RolesPage() {
  const { canAdmin, canReadAudit } = useErpAccess();
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
    <ErpPage eyebrow="Pengaturan" title="Peran pengguna" sub="Peran menentukan siapa boleh mengubah apa. Setiap perubahan tercatat di audit log.">
      <div className="mb-3 space-y-2">
        <Note>Admin lab selalu punya akses Admin sistem, walau tidak dicentang di sini.</Note>
        {!canAdmin && <Note tone="warn">{canReadAudit ? "Anda bisa melihat daftar ini. Mengubahnya perlu peran Admin sistem." : "Daftar lengkap hanya untuk Admin sistem dan Pimpinan. Anda hanya melihat peran Anda sendiri."}</Note>}
        {action.error && <Note tone="warn">{action.error}</Note>}
      </div>
      <DataState state={state}>
        {({ members }) => (
          <Card className="overflow-x-auto p-4">
            <table className="w-full min-w-[920px] text-left text-[14px]">
              <thead className="text-[13px] text-[#6B8289]">
                <tr>
                  <th className="sticky left-0 bg-white pb-2 pr-3 font-medium">Anggota</th>
                  {ERP_ROLES.map((r) => <th key={r.key} title={r.note} className="px-2 pb-2 text-center font-medium">{r.label}</th>)}
                </tr>
              </thead>
              <tbody className="text-[#0F2F36]">
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-[#E3ECED]">
                    <td className="sticky left-0 bg-white py-2 pr-3">
                      <span className="block font-medium">{memberName(m)}</span>
                      <span className="block text-[13px] text-[#6B8289]">{labRoleLabel(m.lab_role)}</span>
                    </td>
                    {ERP_ROLES.map((r) => {
                      const on = held.has(`${m.id}:${r.key}`);
                      return (
                        <td key={r.key} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!canAdmin || action.busy}
                            onChange={() => void toggle(m.id, r.key, !on)}
                            aria-label={`${r.label} untuk ${memberName(m)}`}
                            className="h-4 w-4 accent-[#14919B] disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </DataState>
    </ErpPage>
  );
}
