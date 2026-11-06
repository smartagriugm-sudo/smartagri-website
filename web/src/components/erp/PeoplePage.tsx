import { useState } from "react";
import { LocateFixed, Plus } from "lucide-react";
import { formatLongDate } from "../../lib/pf/dashboard";
import { fetchMembers, memberName, type LabMember } from "../../lib/pf/foundation";
import { CONTRACT_TYPES, PERSON_TYPES, RATE_BASES, currentFix, fetchContracts, fetchPeople, fetchWorkAreas, parseArea, personTypeLabel, saveContract, savePerson, saveWorkArea, type Person, type PersonType } from "../../lib/pf/people";
import { formatRupiah } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note } from "./ui";

// Everyone who works here, with or without a login, and where they may clock in.
// Contracts open only for Staf SDM, Pimpinan, and the person themselves.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

function PersonEditor({ person, people, members, onDone }: { person: Person | null; people: Person[]; members: LabMember[]; onDone: (saved: string | null) => void }) {
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
    if (!name.trim()) return action.setError("Nama wajib diisi.");
    let saved = "";
    if (await action.run(async () => { saved = await savePerson(person?.id ?? null, { account, name, type, supervisor, phone, joined, left, status }); })) onDone(saved);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{person ? `Ubah ${person.full_name}` : "Orang baru"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Nama lengkap"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as PersonType)}>
              {PERSON_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Telepon"><input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <Field label="Akun login" hint="Yang punya akun bisa absen dari ponsel. Yang tidak, dicatat manual.">
          <select className={inputClass} value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Tanpa akun</option>
            {free.map((m) => <option key={m.id} value={m.id}>{memberName(m)}</option>)}
          </select>
        </Field>
        <Field label="Atasan">
          <select className={inputClass} value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>
            <option value="">Tidak ada</option>
            {people.filter((p) => p.id !== person?.id && p.status === "aktif").map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai bekerja"><input type="date" className={inputClass} value={joined} onChange={(e) => setJoined(e.target.value)} /></Field>
          <Field label="Selesai"><input type="date" className={inputClass} value={left} onChange={(e) => setLeft(e.target.value)} /></Field>
        </div>
        {person && (
          <Field label="Status">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Person["status"])}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </Field>
        )}
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(null)}>Batal</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function ContractSection({ person, canEdit }: { person: Person; canEdit: boolean }) {
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
    if (!start) return action.setError("Tanggal mulai wajib diisi.");
    if (end && end < start) return action.setError("Tanggal selesai sebelum tanggal mulai.");
    const value = rate.trim() === "" ? null : Number(rate.trim().replace(/\./g, "").replace(",", "."));
    if (value !== null && (!Number.isFinite(value) || value < 0)) return action.setError("Upah harus angka, tidak boleh negatif.");
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
        <h3 className="text-[14px] font-medium text-[#0F2F36]">Kontrak</h3>
        {canEdit && !adding && <button type="button" onClick={() => setAdding(true)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Tambah</button>}
      </div>
      {adding && (
        <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jenis"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{CONTRACT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
            <Field label="Jabatan"><input className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)} /></Field>
            <Field label="Mulai"><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Selesai"><input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            <Field label="Upah (Rp)"><input className={inputClass} inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
            <Field label="Dasar"><select className={inputClass} value={basis} onChange={(e) => setBasis(e.target.value)}>{RATE_BASES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select></Field>
          </div>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Simpan</PrimaryButton><SecondaryButton onClick={() => setAdding(false)}>Batal</SecondaryButton></div>
        </form>
      )}
      <DataState state={list}>
        {(rows) => rows.length === 0 ? <p className="text-[13px] text-[#4F6B73]">Belum ada kontrak.</p> : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="text-[13.5px]">
                <span className="font-medium text-[#0F2F36]">{CONTRACT_TYPES.find((t) => t.key === c.type)?.label}{c.position ? ` · ${c.position}` : ""}</span>
                <span className="block text-[#4F6B73]">{formatLongDate(c.start_date)} sampai {c.end_date ? formatLongDate(c.end_date) : "tidak ditentukan"}{c.rate_idr !== null ? ` · ${formatRupiah(c.rate_idr)} ${RATE_BASES.find((b) => b.key === c.rate_basis)?.label}` : ""}</span>
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
    if (!fix) return action.setError("Lokasi tidak didapat. Izinkan akses lokasi, atau isi manual.");
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
      <h2 className={`${sectionTitle} px-4 pt-3`}>Lokasi kerja</h2>
      <p className="px-4 pb-2 text-[13px] text-[#4F6B73]">Titik dan radius tempat absen dianggap di dalam area. Tanpa ini, lokasi absen tidak bisa dicek.</p>
      <DataState state={areas}>
        {(rows) => rows.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Belum ada lokasi kerja.</p> : (
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
          <Field label="Nama"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Plant factory SARC" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Lintang"><input className={inputClass} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
            <Field label="Bujur"><input className={inputClass} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
          </div>
          <Field label="Radius (meter)"><input className={inputClass} inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} /></Field>
          <ActionNote action={action} />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={locating} onClick={() => void locate()}><LocateFixed className="h-4 w-4" /> {locating ? "Mencari..." : "Pakai lokasi saya"}</SecondaryButton>
            <PrimaryButton type="submit" disabled={action.busy}>Simpan</PrimaryButton>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function PeoplePage() {
  const { canManagePeople, canReadPeople, canReadPrivate, canWriteContracts } = useErpAccess();
  const state = useLoad(async () => {
    const [people, members] = await Promise.all([fetchPeople(), fetchMembers().catch(() => [] as LabMember[])]);
    return { people, members };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<"new" | "current" | null>(null);

  return (
    <ErpPage
      eyebrow="SDM"
      title="Orang"
      sub="Semua orang yang bekerja di sini, dengan atau tanpa akun login."
      actions={canManagePeople && editing === null && state.data ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Orang baru</PrimaryButton> : undefined}
    >
      {!canReadPeople ? <Note>Halaman ini untuk Staf SDM, Manajer produksi, Admin, dan Pimpinan.</Note> : (
        <DataState state={state}>
          {({ people, members }) => {
            const current = people.find((p) => p.id === selected) ?? null;
            return (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-3">
                  {!canManagePeople && <ReadOnlyNote who="Staf SDM" />}
                  <Card>
                    {people.length === 0 ? <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada orang. Tambahkan yang pertama.</p> : (
                      <ul>
                        {people.map((p) => (
                          <li key={p.id} className="border-t border-[#EDF2F2] first:border-0">
                            <button type="button" aria-pressed={selected === p.id} onClick={() => { setSelected(p.id); setEditing(null); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-[#F6F8F8] ${selected === p.id ? "bg-[#F1F8F8]" : ""}`}>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-[14px] font-medium ${p.status === "aktif" ? "text-[#0F2F36]" : "text-[#4F6B73]"}`}>{p.full_name}{p.status !== "aktif" ? " (nonaktif)" : ""}</span>
                                <span className="block truncate text-[13px] text-[#4F6B73]">{personTypeLabel(p.person_type)}{p.supervisor_name ? ` · atasan ${p.supervisor_name}` : ""}</span>
                              </span>
                              <span className="shrink-0 text-[13px] text-[#4F6B73]">{p.has_account ? "Punya akun" : "Tanpa akun"}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Disclosure title="Lokasi kerja"><AreasCard canEdit={canManagePeople} /></Disclosure>
                </div>
                <div className="min-w-0">
                  {editing !== null ? (
                    <PersonEditor key={editing === "new" ? "new" : current?.id} person={editing === "new" ? null : current} people={people} members={members} onDone={(saved) => { setEditing(null); if (saved) { setSelected(saved); void state.reload(); } }} />
                  ) : current ? (
                    <Card className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className={sectionTitle}>{current.full_name}</h2>
                          <p className="text-[13px] text-[#4F6B73]">{personTypeLabel(current.person_type)}</p>
                        </div>
                        {canManagePeople && <SecondaryButton onClick={() => setEditing("current")}>Ubah</SecondaryButton>}
                      </div>
                      <dl className="space-y-1.5 text-[13.5px]">
                        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">Telepon</dt><dd className="font-medium text-[#0F2F36]">{current.phone || "-"}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">Atasan</dt><dd className="font-medium text-[#0F2F36]">{current.supervisor_name ?? "-"}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">Mulai</dt><dd className="font-medium text-[#0F2F36]">{current.joined_on ? formatLongDate(current.joined_on) : "-"}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">Akun login</dt><dd className="font-medium text-[#0F2F36]">{current.has_account ? "Terhubung" : "Tanpa akun"}</dd></div>
                      </dl>
                      {canReadPrivate ? <ContractSection key={current.id} person={current} canEdit={canWriteContracts} /> : <p className="border-t border-[#EDF2F2] pt-3 text-[13px] text-[#4F6B73]">Kontrak hanya terbuka untuk Staf SDM, Pimpinan, dan orang yang bersangkutan.</p>}
                    </Card>
                  ) : null}
                </div>
              </div>
            );
          }}
        </DataState>
      )}
    </ErpPage>
  );
}
