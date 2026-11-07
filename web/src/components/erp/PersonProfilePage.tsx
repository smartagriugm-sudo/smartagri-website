import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { addDays } from "../../lib/pf/facility";
import { AUDIT_ACTIONS, AUDIT_TABLES, auditSubject, fetchActorAudit, fetchMembers, type AuditEntry, type LabMember } from "../../lib/pf/foundation";
import { LEAVE_STATUS, LEAVE_TYPES, attendanceFlags, cameLate, clockText, fetchContracts, fetchPeople, fetchPersonLabor, fetchPersonRecords, formatMinutes, personTypeLabel, savePersonDetails, timeOfDay, workedMinutes, type Attendance, type Contract, type LaborEntry, type Leave, type Person, type Shift } from "../../lib/pf/people";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { ContractSection, PersonAvatar, PersonEditor } from "./PeoplePage";
import { Card, Note, Rows, Segmented } from "./ui";

// One person's page, for whoever looks after the team: who they are, how to reach them,
// when they came, what they are scheduled for, and what they have been doing. Contract
// terms still open only for HR staff, Leadership and the person themselves.

type Tab = "overview" | "attendance" | "schedule" | "activity" | "contracts";

const WINDOW_DAYS = 30;
const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

/** The newest contract already started and not yet over. */
const currentContract = (rows: readonly Contract[], today: string) => rows.filter((c) => c.start_date <= today && (!c.end_date || c.end_date >= today)).sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;

function DetailsEditor({ person, onDone }: { person: Person; onDone: (saved: boolean) => void }) {
  const [email, setEmail] = useState(person.email ?? "");
  const [address, setAddress] = useState(person.address ?? "");
  const [emergency, setEmergency] = useState(person.emergency_contact ?? "");
  const [skills, setSkills] = useState(person.skills ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");
  const action = useAction();
  const submit = async () => {
    if (await action.run(() => savePersonDetails(person.id, { email, address, emergency, skills, notes }))) onDone(true);
  };
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>Edit details</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Email"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Address"><input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Emergency contact" hint="A name and a phone number."><input className={inputClass} value={emergency} onChange={(e) => setEmergency(e.target.value)} /></Field>
        <Field label="Skills" hint="Separate with commas: nursery work, nutrient mixing, harvesting."><input className={inputClass} value={skills} onChange={(e) => setSkills(e.target.value)} /></Field>
        <Field label="Notes"><textarea rows={3} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Save"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function AttendanceChip({ record }: { record: Attendance }) {
  if (record.missed_out) return <Chip label="Missed clock-out" className="bg-[#FFF6E5] text-[#8A5A07]" />;
  if (cameLate(record)) return <Chip label="Late" className="bg-[#FFF6E5] text-[#8A5A07]" />;
  if (!record.clock_out) return <Chip label="Still in" className="bg-[#E3F4F4] text-[#0B6477]" />;
  return <Chip label="On time" className="bg-[#E3F7F0] text-[#0E7A5C]" />;
}

const attendanceColumns: Column<Attendance>[] = [
  { key: "date", label: "Date", phone: "title", sort: (a, b) => a.work_date.localeCompare(b.work_date), cell: (a) => <CellTitle title={formatLongDate(a.work_date)} sub={a.source === "manual" ? "Recorded by hand" : undefined} /> },
  { key: "in", label: "In", track: "80px", cell: (a) => <span className="tabular-nums">{timeOfDay(a.clock_in)}</span> },
  { key: "out", label: "Out", track: "80px", cell: (a) => <span className="tabular-nums">{a.clock_out ? timeOfDay(a.clock_out) : "-"}</span> },
  { key: "hours", label: "Worked", track: "120px", align: "right", sort: (a, b) => (workedMinutes(a) ?? 0) - (workedMinutes(b) ?? 0), cell: (a) => { const m = workedMinutes(a); return <span className="tabular-nums">{m === null ? "-" : formatMinutes(m)}</span>; } },
  { key: "state", label: "Status", track: "150px", cell: (a) => <AttendanceChip record={a} /> },
  { key: "flags", label: "To check", phone: "hidden", cell: (a) => { const flags = attendanceFlags(a); return <span className={`block truncate text-[13px] ${flags.length ? "font-medium text-[#8A5A07]" : ""}`}>{flags.join(" · ") || "-"}</span>; } },
];

const shiftColumns: Column<Shift>[] = [
  { key: "date", label: "Date", phone: "title", sort: (a, b) => a.work_date.localeCompare(b.work_date), cell: (s) => <CellTitle title={formatLongDate(s.work_date)} /> },
  { key: "time", label: "Time", track: "130px", cell: (s) => <span className="tabular-nums">{clockText(s.start_at)}–{clockText(s.end_at)}</span> },
  { key: "area", label: "Work area", cell: (s) => <span className="block truncate text-[13px]">{s.area_name ?? "Any work area"}</span> },
];

const leaveColumns: Column<Leave>[] = [
  { key: "type", label: "Type", track: "110px", phone: "title", cell: (l) => <span className="font-medium text-[#0F2F36]">{LEAVE_TYPES.find((t) => t.key === l.type)?.label}</span> },
  { key: "date", label: "Dates", sort: (a, b) => a.start_date.localeCompare(b.start_date), cell: (l) => <span className="text-[13px]">{formatLongDate(l.start_date)}{l.end_date !== l.start_date ? ` to ${formatLongDate(l.end_date)}` : ""}</span> },
  { key: "reason", label: "Reason", phone: "hidden", cell: (l) => <span className="block truncate text-[13px]">{l.reason || "-"}</span> },
  { key: "status", label: "Status", track: "120px", cell: (l) => <Chip label={LEAVE_STATUS[l.status].label} className={LEAVE_STATUS[l.status].className} /> },
];

type Activity = { key: string; at: string; title: string; sub: string; link: string | null };

function activityOf(labor: readonly LaborEntry[], audit: readonly AuditEntry[]): Activity[] {
  const work = labor.map((l): Activity => ({ key: `l${l.id}`, at: `${l.work_date}T12:00:00+07:00`, title: l.activity || "Work on a batch", sub: `${l.batch_code} · ${formatMinutes(l.minutes)}`, link: `/erp/batch/${l.batch_id}` }));
  const changes = audit.map((e): Activity => ({ key: `a${e.id}`, at: e.at, title: `${AUDIT_ACTIONS[e.action]}: ${AUDIT_TABLES.find((t) => t.key === e.table_name)?.label ?? e.table_name}`, sub: auditSubject(e), link: null }));
  return [...work, ...changes].sort((a, b) => b.at.localeCompare(a.at));
}

function ActivityList({ items, limit }: { items: Activity[]; limit?: number }) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) return <p className="px-4 py-6 text-center text-[14px] text-[#4F6B73]">No activity recorded yet.</p>;
  return (
    <ol>
      {shown.map((a) => {
        const inner = (
          <>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#14919B]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{a.title}</span>
              <span className="block truncate text-[13px] text-[#4F6B73]">{a.sub}</span>
            </span>
            <span className="shrink-0 text-[12.5px] tabular-nums text-[#4F6B73]">{a.key.startsWith("l") ? formatLongDate(a.at.slice(0, 10)) : formatDateTime(a.at)}</span>
          </>
        );
        const cls = "flex items-start gap-3 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0";
        return <li key={a.key}>{a.link ? <Link to={a.link} className={`${cls} hover:bg-[#F3F7F6]`}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
      })}
    </ol>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-4">
      <p className="text-[12px] font-medium tracking-[0.03em] text-[#4F6B73]">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-[#0F2F36]">{value}</p>
      <p className="mt-1.5 text-[12.5px] text-[#4F6B73]">{sub}</p>
    </div>
  );
}

function hoursText(minutes: number) {
  return `${Math.round(minutes / 60).toLocaleString("en-GB")} h`;
}

export default function PersonProfilePage({ id }: { id: string }) {
  const today = jakartaToday();
  const { canManagePeople, canReadPeople, canReadPrivate, canWriteContracts } = useErpAccess();
  const base = useLoad(async () => {
    const [people, members] = await Promise.all([fetchPeople(), fetchMembers().catch(() => [] as LabMember[])]);
    return { people, members };
  }, []);
  const person = base.data?.people.find((p) => p.id === id) ?? null;
  const profileId = person?.profile_id ?? null;
  const records = useLoad(async () => {
    const [own, labor, audit, contracts] = await Promise.all([
      fetchPersonRecords(id),
      fetchPersonLabor(id),
      profileId ? fetchActorAudit(profileId) : Promise.resolve([] as AuditEntry[]),
      canReadPrivate ? fetchContracts(id).catch(() => [] as Contract[]) : Promise.resolve([] as Contract[]),
    ]);
    return { ...own, labor, audit, contracts };
  }, [id, profileId, canReadPrivate]);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState<"person" | "details" | null>(null);

  const activity = useMemo(() => activityOf(records.data?.labor ?? [], records.data?.audit ?? []), [records.data]);

  const back = <Link to="/erp/people" className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> All people</Link>;

  if (!canReadPeople) {
    return <ErpPage eyebrow="Team" title="Profile"><Note>This page is for HR staff, Production managers, Admins and Leadership.</Note></ErpPage>;
  }

  return (
    <ErpPage eyebrow="Team" title={person?.full_name ?? "Profile"} actions={back}>
      <DataState state={base}>
        {({ people, members }) => {
          if (!person) return <Note>This person could not be found.</Note>;
          const member = members.find((m) => m.id === person.profile_id);
          const skills = (person.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
          const from = addDays(today, -WINDOW_DAYS);
          return (
            <div className="space-y-4">
              <Card className="p-4 md:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <PersonAvatar name={person.full_name} url={member?.avatar_url} size={72} />
                  <div className="min-w-0 flex-1 basis-[260px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip label={person.status === "aktif" ? "Active" : "Inactive"} className={person.status === "aktif" ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} />
                      <span className="text-[14px] text-[#36525A]">{personTypeLabel(person.person_type)}</span>
                      {records.data && (() => { const c = currentContract(records.data.contracts, today); return c?.position ? <span className="text-[14px] text-[#36525A]">· {c.position}</span> : null; })()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-[#36525A]">
                      {person.phone && <a href={`tel:${person.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#0B6477]"><Phone className="h-3.5 w-3.5" /><span className="tabular-nums">{person.phone}</span></a>}
                      {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-1.5 hover:text-[#0B6477]"><Mail className="h-3.5 w-3.5" />{person.email}</a>}
                      {person.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{person.address}</span>}
                    </div>
                    {skills.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{skills.map((s) => <span key={s} className="rounded-full bg-[#EEF5F5] px-2.5 py-1 text-xs font-medium text-[#0B6477]">{s}</span>)}</div>}
                  </div>
                  {canManagePeople && editing === null && (
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => setEditing("details")}>Edit details</SecondaryButton>
                      <SecondaryButton onClick={() => setEditing("person")}>Edit employment</SecondaryButton>
                    </div>
                  )}
                </div>
              </Card>

              {editing === "person" && <PersonEditor person={person} people={people} members={members} onDone={(saved) => { setEditing(null); if (saved) void base.reload(); }} />}
              {editing === "details" && <DetailsEditor person={person} onDone={(saved) => { setEditing(null); if (saved) void base.reload(); }} />}

              <DataState state={records}>
                {({ attendance, shifts, leaves, labor }) => {
                  const recent = attendance.filter((a) => a.work_date >= from);
                  const days = new Set(recent.map((a) => a.work_date)).size;
                  const late = recent.filter(cameLate).length;
                  const worked = recent.reduce((n, a) => n + (workedMinutes(a) ?? 0), 0);
                  const onBatches = labor.filter((l) => l.work_date >= from).reduce((n, l) => n + l.minutes, 0);
                  const upcoming = shifts.filter((s) => s.work_date >= today).sort((a, b) => a.work_date.localeCompare(b.work_date));
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-px overflow-clip rounded-2xl border border-[#0B6477]/12 bg-[#0B6477]/12 lg:grid-cols-4">
                        <Stat label="Days present" value={`${days}`} sub={`last ${WINDOW_DAYS} days`} />
                        <Stat label="Late arrivals" value={`${late}`} sub={`last ${WINDOW_DAYS} days`} />
                        <Stat label="Hours worked" value={hoursText(worked)} sub="from clock-in and clock-out" />
                        <Stat label="Hours on batches" value={hoursText(onBatches)} sub="logged against a batch" />
                      </div>

                      <Segmented value={tab} onChange={setTab} options={[{ key: "overview", label: "Overview" }, { key: "attendance", label: "Attendance" }, { key: "schedule", label: "Schedule and leave" }, { key: "activity", label: "Activity" }, { key: "contracts", label: "Contracts" }]} />

                      {tab === "overview" && (
                        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                          <Card className="p-4">
                            <h2 className={`${sectionTitle} mb-3`}>Details</h2>
                            <Rows rows={[
                              ["Type", personTypeLabel(person.person_type)],
                              ["Supervisor", person.supervisor_name ?? "-"],
                              ["Joined", person.joined_on ? formatLongDate(person.joined_on) : "-"],
                              ["Left", person.left_on ? formatLongDate(person.left_on) : "-"],
                              ["Login", person.has_account ? "Connected" : "None"],
                              ["Emergency contact", person.emergency_contact || "-"],
                            ]} />
                            {person.notes && <p className="mt-3 border-t border-[#EDF2F2] pt-3 text-[13.5px] leading-[1.5] text-[#36525A]">{person.notes}</p>}
                          </Card>
                          <div className="min-w-0 space-y-4">
                            <Card>
                              <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2">
                                <h2 className={sectionTitle}>Recent activity</h2>
                                {activity.length > 5 && <button type="button" onClick={() => setTab("activity")} className="text-[13px] font-medium text-[#0B6477] hover:underline">See all</button>}
                              </div>
                              <div className="border-t border-[#EDF2F2]"><ActivityList items={activity} limit={5} /></div>
                            </Card>
                            <Card>
                              <h2 className={`${sectionTitle} px-4 pt-3 pb-2`}>Next shifts</h2>
                              {upcoming.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">Nothing scheduled.</p> : (
                                <ul>
                                  {upcoming.slice(0, 5).map((s) => (
                                    <li key={s.id} className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                                      <span className="text-[#0F2F36]">{formatLongDate(s.work_date)}</span>
                                      <span className="tabular-nums text-[#4F6B73]">{clockText(s.start_at)}–{clockText(s.end_at)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </Card>
                          </div>
                        </div>
                      )}

                      {tab === "attendance" && <DataTable rows={attendance} rowKey={(a) => a.id} noun="records" columns={attendanceColumns} empty="No attendance recorded yet." pills={[{ key: "late", label: "Late", dot: "#E0A100", match: cameLate }, { key: "missed", label: "Missed clock-out", dot: "#E0A100", match: (a) => a.missed_out }]} />}

                      {tab === "schedule" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h2 className={sectionTitle}>Shifts</h2>
                            <DataTable rows={shifts} rowKey={(s) => s.id} noun="shifts" columns={shiftColumns} empty="No shifts yet." initialPill="next" pills={[{ key: "next", label: "Coming up", dot: "#14919B", match: (s) => s.work_date >= today }, { key: "past", label: "Past", dot: "#8FA3A8", match: (s) => s.work_date < today }]} />
                          </div>
                          <div className="space-y-2">
                            <h2 className={sectionTitle}>Leave</h2>
                            <DataTable rows={leaves} rowKey={(l) => l.id} noun="requests" columns={leaveColumns} empty="No leave requests yet." />
                          </div>
                        </div>
                      )}

                      {tab === "activity" && <Card><ActivityList items={activity} /></Card>}

                      {tab === "contracts" && (canReadPrivate ? (
                        <Card className="p-4"><ContractSection person={person} canEdit={canWriteContracts} /></Card>
                      ) : <Note>Contracts open only for HR staff, Leadership and the person themselves.</Note>)}
                    </div>
                  );
                }}
              </DataState>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
