import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LocateFixed, Plus } from "lucide-react";
import { initials } from "../../lib/pf/calendar";
import { formatLongDate } from "../../lib/pf/dashboard";
import { fetchMembers, memberName, type LabMember } from "../../lib/pf/foundation";
import { CONTRACT_TYPES, PERSON_TYPES, RATE_BASES, currentFix, fetchContracts, fetchPeople, fetchWorkAreas, parseArea, personTypeLabel, saveContract, savePerson, saveWorkArea, type Person, type PersonType } from "../../lib/pf/people";
import { formatRupiah } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Everyone who works here, with or without a login, and where they may clock in.
// Contracts open only for Staf SDM, Pimpinan, and the person themselves.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

export function PersonEditor({ person, people, members, onDone }: { person: Person | null; people: Person[]; members: LabMember[]; onDone: (saved: string | null) => void }) {
  const [name, setName] = useState(person?.full_name ?? "");
  const [type, setType] = useState<PersonType>(person?.person_type ?? "karyawan");
  const [account, setAccount] = useState(person?.profile_id ?? "");
  const [supervisor, setSupervisor] = useState(person?.supervisor_id ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [joined, setJoined] = useState(person?.joined_on ?? "");
  const [left, setLeft] = useState(person?.left_on ?? "");
  const [status, setStatus] = useState<Person["status"]>(person?.status ?? "aktif");
  const action = useAction();
  const taken = new Set(people.filter((p) => p.id !== person?.id && p.profile_id).map((p) => p.profile_id));
  const free = members.filter((m) => !taken.has(m.id));

  const submit = async () => {
    if (!name.trim()) return action.setError("A name is required.");
    let saved = "";
    if (await action.run(async () => { saved = await savePerson(person?.id ?? null, { account, name, type, supervisor, phone, joined, left, status }); })) onDone(saved);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{person ? `Edit ${person.full_name}` : "New person"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Full name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as PersonType)}>
              {PERSON_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Phone"><input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <Field label="Login account" hint="People with an account can clock in from a phone. Others are recorded by hand.">
          <select className={inputClass} value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">No login</option>
            {free.map((m) => <option key={m.id} value={m.id}>{memberName(m)}</option>)}
          </select>
        </Field>
        <Field label="Supervisor">
          <select className={inputClass} value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>
            <option value="">None</option>
            {people.filter((p) => p.id !== person?.id && p.status === "aktif").map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Started work"><input type="date" className={inputClass} value={joined} onChange={(e) => setJoined(e.target.value)} /></Field>
          <Field label="Done"><input type="date" className={inputClass} value={left} onChange={(e) => setLeft(e.target.value)} /></Field>
        </div>
        {person && (
          <Field label="Status">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Person["status"])}>
              <option value="aktif">Active</option>
              <option value="nonaktif">Inactive</option>
            </select>
          </Field>
        )}
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving…" : "Save"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(null)}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export function ContractSection({ person, canEdit }: { person: Person; canEdit: boolean }) {
  const list = useLoad(() => fetchContracts(person.id), [person.id]);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("kontrak");
  const [position, setPosition] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rate, setRate] = useState("");
  const [basis, setBasis] = useState("bulan");
  const action = useAction();

  const submit = async () => {
    if (!start) return action.setError("A start date is required.");
    if (end && end < start) return action.setError("The end date is before the start date.");
    const value = rate.trim() === "" ? null : Number(rate.trim().replace(/\./g, "").replace(",", "."));
    if (value !== null && (!Number.isFinite(value) || value < 0)) return action.setError("Pay must be a number, not negative.");
    const saved = await action.run(async () => {
      await saveContract(person.id, { type, position, start, end, rate: value, basis });
      await list.reload();
    });
    if (saved) {
      setAdding(false);
      setPosition("");
      setStart("");
      setEnd("");
      setRate("");
    }
  };

  return (
    <div className="border-t border-[#EDF2F2] pt-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium text-[#0F2F36]">Contract</h3>
        {canEdit && !adding && <button type="button" onClick={() => setAdding(true)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Add</button>}
      </div>
      {adding && (
        <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{CONTRACT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
            <Field label="Position"><input className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)} /></Field>
            <Field label="Starts"><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Done"><input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            <Field label="Pay (Rp)"><input className={inputClass} inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
            <Field label="Basis"><select className={inputClass} value={basis} onChange={(e) => setBasis(e.target.value)}>{RATE_BASES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select></Field>
          </div>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Save</PrimaryButton><SecondaryButton onClick={() => setAdding(false)}>Cancel</SecondaryButton></div>
        </form>
      )}
      <DataState state={list}>
        {(rows) => rows.length === 0 ? <p className="text-[13px] text-[#4F6B73]">No contracts yet.</p> : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="text-[13.5px]">
                <span className="font-medium text-[#0F2F36]">{CONTRACT_TYPES.find((t) => t.key === c.type)?.label}{c.position ? ` · ${c.position}` : ""}</span>
                <span className="block text-[#4F6B73]">{formatLongDate(c.start_date)} to {c.end_date ? formatLongDate(c.end_date) : "not set"}{c.rate_idr !== null ? ` · ${formatRupiah(c.rate_idr)} ${RATE_BASES.find((b) => b.key === c.rate_basis)?.label}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </div>
  );
}

function AreasCard({ canEdit }: { canEdit: boolean }) {
  const areas = useLoad(fetchWorkAreas);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [locating, setLocating] = useState(false);
  const action = useAction();

  const locate = async () => {
    setLocating(true);
    const fix = await currentFix();
    setLocating(false);
    if (!fix) return action.setError("Could not get a location. Allow location access, or fill it in by hand.");
    setLat(String(fix.lat));
    setLng(String(fix.lng));
  };
  const submit = async () => {
    const parsed = parseArea(name, lat, lng, radius);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await saveWorkArea(null, name, parsed.lat, parsed.lng, parsed.radius);
      await areas.reload();
    });
    if (saved) {
      setName("");
      setLat("");
      setLng("");
    }
  };

  return (
    <Card>
      <h2 className={`${sectionTitle} px-4 pt-3`}>Work area</h2>
      <p className="px-4 pb-2 text-[13px] text-[#4F6B73]">The point and radius where a clock-in counts as inside the area. Without this, clock-in locations cannot be checked.</p>
      <DataState state={areas}>
        {(rows) => rows.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No work areas yet.</p> : (
          <ul>
            {rows.map((a) => (
              <li key={a.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                <span className="font-medium text-[#0F2F36]">{a.name}</span>
                <span className="block text-[13px] tabular-nums text-[#4F6B73]">{a.lat}, {a.lng} · radius {a.radius_m} m</span>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      {canEdit && (
        <form className="space-y-2 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="SARC plant factory" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude"><input className={inputClass} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
            <Field label="Longitude"><input className={inputClass} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
          </div>
          <Field label="Radius (metres)"><input className={inputClass} inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} /></Field>
          <ActionNote action={action} />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={locating} onClick={() => void locate()}><LocateFixed className="h-4 w-4" /> {locating ? "Searching…" : "Use my location"}</SecondaryButton>
            <PrimaryButton type="submit" disabled={action.busy}>Save</PrimaryButton>
          </div>
        </form>
      )}
    </Card>
  );
}

export function PersonAvatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full bg-[#E3F4F4] font-medium text-[#0B6477]" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials(name)}</span>;
}

export default function PeoplePage() {
  const { canManagePeople, canReadPeople } = useErpAccess();
  const navigate = useNavigate();
  const state = useLoad(async () => {
    const [people, members] = await Promise.all([fetchPeople(), fetchMembers().catch(() => [] as LabMember[])]);
    return { people, members };
  });
  const [adding, setAdding] = useState(false);

  return (
    <ErpPage
      eyebrow="Team"
      title="People"
      sub="Everyone who works here, with or without a login. Open a person for their profile and activity."
      actions={canManagePeople && !adding && state.data ? <PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New person</PrimaryButton> : undefined}
    >
      {!canReadPeople ? <Note>This page is for HR staff, Production managers, Admins and Leadership.</Note> : (
        <DataState state={state}>
          {({ people, members }) => {
            const avatar = new Map(members.map((m) => [m.id, m.avatar_url]));
            const active = people.filter((p) => p.status === "aktif");
            return (
              <div className={`grid grid-cols-1 items-start gap-4 ${adding ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
                <div className="min-w-0 space-y-3">
                  {!canManagePeople && <ReadOnlyNote who="HR staff" />}
                  <DataTable
                    rows={people}
                    rowKey={(p) => p.id}
                    noun="people"
                    rowLink={(p) => `/erp/people/${p.id}`}
                    searchText={(p) => `${p.full_name} ${p.phone} ${p.email ?? ""} ${p.supervisor_name ?? ""}`}
                    searchLabel="Search by name, phone or supervisor"
                    initialPill="active"
                    figures={[
                      { label: "Active people", value: active.length, tone: "#0E9B7A", pill: "active" },
                      { label: "With a login", value: active.filter((p) => p.has_account).length, tone: "#14919B", pill: "account" },
                      { label: "Without a login", value: active.filter((p) => !p.has_account).length, tone: "#E0A100", pill: "noaccount" },
                      { label: "Inactive", value: people.length - active.length, tone: "#8FA3A8", pill: "inactive" },
                    ]}
                    pills={[
                      { key: "active", label: "Active", dot: "#0E9B7A", match: (p) => p.status === "aktif" },
                      { key: "account", label: "With a login", dot: "#14919B", match: (p) => p.status === "aktif" && p.has_account },
                      { key: "noaccount", label: "Without a login", dot: "#E0A100", match: (p) => p.status === "aktif" && !p.has_account },
                      { key: "inactive", label: "Inactive", dot: "#8FA3A8", match: (p) => p.status !== "aktif" },
                    ]}
                    filters={[{ label: "Filter by type", all: "All types", value: (p) => personTypeLabel(p.person_type) }]}
                    empty="No people yet. Add the first one."
                    columns={[
                      { key: "name", label: "Name", track: "minmax(0,1.4fr)", phone: "title", sort: (a, b) => a.full_name.localeCompare(b.full_name), cell: (p) => (
                        <span className="flex min-w-0 items-center gap-3">
                          <PersonAvatar name={p.full_name} url={p.profile_id ? avatar.get(p.profile_id) : null} />
                          <CellTitle title={p.full_name} sub={personTypeLabel(p.person_type)} muted={p.status !== "aktif"} />
                        </span>
                      ) },
                      { key: "supervisor", label: "Supervisor", sort: (a, b) => (a.supervisor_name ?? "").localeCompare(b.supervisor_name ?? ""), phone: "hidden", cell: (p) => <span className="block truncate text-[13px]">{p.supervisor_name ?? "-"}</span> },
                      { key: "phone", label: "Phone", track: "150px", cell: (p) => <span className="text-[13px] tabular-nums">{p.phone || "-"}</span> },
                      { key: "joined", label: "Joined", track: "130px", phone: "hidden", sort: (a, b) => (a.joined_on ?? "").localeCompare(b.joined_on ?? ""), cell: (p) => <span className="text-[13px]">{p.joined_on ? formatLongDate(p.joined_on) : "-"}</span> },
                      { key: "status", label: "Status", track: "110px", cell: (p) => <Chip label={p.status === "aktif" ? "Active" : "Inactive"} className={p.status === "aktif" ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} /> },
                    ] satisfies Column<Person>[]}
                  />
                  <Disclosure title="Work areas"><AreasCard canEdit={canManagePeople} /></Disclosure>
                </div>
                {adding && (
                  <div className="min-w-0">
                    <PersonEditor person={null} people={people} members={members} onDone={(saved) => { setAdding(false); if (saved) void navigate({ to: "/erp/people/$id", params: { id: saved } }); }} />
                  </div>
                )}
              </div>
            );
          }}
        </DataState>
      )}
    </ErpPage>
  );
}
