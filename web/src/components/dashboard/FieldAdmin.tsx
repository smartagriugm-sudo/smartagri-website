import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Copy, KeyRound, Plus, Trash2, UserPlus } from "lucide-react";
import { body } from "../../lib/fonts";
import { Panel, Pill } from "./parts";
import {
  addMember,
  issueToken,
  loadAccess,
  removeMember,
  saveSite,
  validSiteCode,
  type EdgeSite,
  type SiteMember,
} from "../../lib/edge/field";
import { useT } from "../../lib/i18n";

// Lab admins only (the RPCs refuse anyone else): register a site, hand its edge PC a
// token, and choose which accounts may read it. Only lab admins see every site;
// researchers and partners alike see the sites listed for them here.

const INPUT =
  "h-9 w-full rounded-lg border border-[#0B6477]/15 bg-white px-3 text-[13px] text-neutral-900 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";
const BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-50";
const PRIMARY = `${BUTTON} bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99]`;
const SECONDARY = `${BUTTON} border border-[#0B6477]/15 text-[#0B6477] hover:bg-[#0B6477]/6`;

type Draft = { id: string | null; code: string; name: string; location: string; interval_s: number };
const BLANK: Draft = { id: null, code: "", name: "", location: "", interval_s: 600 };

export default function FieldAdmin({ sites, onChanged }: { sites: EdgeSite[]; onChanged: () => void }) {
  const [selected, setSelected] = useState<string | "new">(sites[0]?.id ?? "new");
  const site = sites.find((s) => s.id === selected) ?? null;
  const t = useT();

  useEffect(() => {
    if (selected !== "new" && !sites.some((s) => s.id === selected)) setSelected(sites[0]?.id ?? "new");
  }, [sites, selected]);

  return (
    <Panel
      title={t({ en: "Manage field sites", id: "Kelola lokasi lapangan" })}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {t({ en: "Lab admins only", id: "Khusus admin lab" })}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {sites.map((s) => (
          <Pill key={s.id} active={s.id === selected} onClick={() => setSelected(s.id)}>
            {s.name}
          </Pill>
        ))}
        <Pill active={selected === "new"} onClick={() => setSelected("new")}>
          {t({ en: "+ New site", id: "+ Lokasi baru" })}
        </Pill>
      </div>
      <SiteForm
        key={site?.id ?? "new"}
        initial={site ? { id: site.id, code: site.code, name: site.name, location: site.location, interval_s: site.interval_s } : BLANK}
        onSaved={(id) => {
          setSelected(id);
          onChanged();
        }}
      />
      {site && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <TokenBox key={`t-${site.id}`} site={site} />
          <AccessBox key={`a-${site.id}`} site={site} />
        </div>
      )}
    </Panel>
  );
}

function SiteForm({ initial, onSaved }: { initial: Draft; onSaved: (id: string) => void }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const codeOk = validSiteCode(draft.code);
  const t = useT();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!codeOk || !draft.name.trim()) return;
    setBusy(true);
    const r = await saveSite({ ...draft, code: draft.code.trim().toLowerCase() });
    setBusy(false);
    if (r.error || !r.data) setMessage({ ok: false, text: r.error ?? t({ en: "Not saved", id: "Tidak tersimpan" }) });
    else {
      setMessage({ ok: true, text: t({ en: "Saved", id: "Tersimpan" }) });
      onSaved(r.data);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1.4fr_110px_auto] lg:items-end" style={body}>
      <Field label={t({ en: "Code (lower case, dashes)", id: "Kode (huruf kecil, tanda hubung)" })}>
        <input className={INPUT} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="sgh-grabag" required />
      </Field>
      <Field label={t({ en: "Name", id: "Nama" })}>
        <input className={INPUT} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Smart Greenhouse Grabag" required />
      </Field>
      <Field label={t({ en: "Location", id: "Lokasi" })}>
        <input className={INPUT} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Grabag, Magelang" />
      </Field>
      <Field label={t({ en: "Push every (s)", id: "Kirim tiap (detik)" })}>
        <input
          className={INPUT}
          type="number"
          min={10}
          max={3600}
          value={draft.interval_s}
          onChange={(e) => setDraft({ ...draft, interval_s: Number(e.target.value) || 600 })}
        />
      </Field>
      <div className="flex items-center gap-3">
        <button type="submit" className={PRIMARY} disabled={busy || !codeOk || !draft.name.trim()}>
          <Plus className="h-4 w-4" /> {draft.id ? t({ en: "Save", id: "Simpan" }) : t({ en: "Add site", id: "Tambah lokasi" })}
        </button>
        {message && (
          <span className="text-[12px]" style={{ color: message.ok ? "#0E9F6E" : "#C4342F" }}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

function TokenBox({ site }: { site: EdgeSite }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const t = useT();

  async function issue() {
    const ask = t({
      en: `Create a new token for ${site.name}? The edge PC's current token stops working at once.`,
      id: `Buat token baru untuk ${site.name}? Token edge PC yang sekarang langsung berhenti berlaku.`,
    });
    if (!window.confirm(ask)) return;
    setBusy(true);
    const r = await issueToken(site.id);
    setBusy(false);
    setError(r.error);
    setToken(r.data);
    setCopied(false);
  }

  return (
    <div style={body}>
      <h4 className="mb-1 text-[13px] font-medium text-neutral-900">{t({ en: "Edge PC token", id: "Token edge PC" })}</h4>
      <p className="mb-3 text-[12px] leading-relaxed text-neutral-500">
        {t({
          en: "The edge PC sends with this token (CLOUD_SYNC_TOKEN in its .env). It is shown once; only its hash is stored. A new token cuts off the old one.",
          id: "Edge PC mengirim data dengan token ini (CLOUD_SYNC_TOKEN di .env-nya). Token hanya ditampilkan sekali; yang disimpan hanya hash-nya. Token baru memutus token lama.",
        })}
      </p>
      <button type="button" className={SECONDARY} onClick={issue} disabled={busy}>
        <KeyRound className="h-4 w-4" /> {t({ en: "Create token", id: "Buat token" })}
      </button>
      {error && <p className="mt-2 text-[12px] text-[#C4342F]">{error}</p>}
      {token && (
        <div className="mt-3 rounded-xl border border-[#45DFB1]/60 bg-[#45DFB1]/10 p-3">
          <p className="mb-2 text-[12px] text-[#0B2A22]">{t({ en: "Copy it now. It will not be shown again.", id: "Salin sekarang. Token tidak akan ditampilkan lagi." })}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-white px-2 py-1.5 text-[12px] text-neutral-800">{token}</code>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => {
                void navigator.clipboard.writeText(token).then(() => setCopied(true));
              }}
            >
              <Copy className="h-4 w-4" /> {copied ? t({ en: "Copied", id: "Tersalin" }) : t({ en: "Copy", id: "Salin" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccessBox({ site }: { site: EdgeSite }) {
  const [members, setMembers] = useState<SiteMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  async function reload() {
    const r = await loadAccess(site.id);
    setMembers(r.data);
    setError(r.error);
  }
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const r = await addMember(site.id, email);
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      setEmail("");
      await reload();
    }
  }

  async function remove(m: SiteMember) {
    const who = m.full_name || m.email;
    if (!window.confirm(t({ en: `Remove ${who} from ${site.name}?`, id: `Hapus ${who} dari ${site.name}?` }))) return;
    const r = await removeMember(site.id, m.user_id);
    if (r.error) setError(r.error);
    else await reload();
  }

  return (
    <div style={body}>
      <h4 className="mb-1 text-[13px] font-medium text-neutral-900">{t({ en: "Access", id: "Akses" })}</h4>
      <p className="mb-3 text-[12px] leading-relaxed text-neutral-500">
        {t({
          en: "Researchers and partners only see the sites listed for them, lab admins see every site. A new account signs up on /sign-up and is approved in Account > Lab members first. Then add its email here.",
          id: "Peneliti dan mitra hanya melihat lokasi yang terdaftar untuk mereka, admin lab melihat semua lokasi. Akun baru mendaftar di /sign-up dan disetujui dulu di Akun > Anggota lab. Lalu tambahkan email-nya di sini.",
        })}
      </p>
      <form onSubmit={add} className="mb-3 flex gap-2">
        <input
          className={INPUT}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t({ en: "name@company.com", id: "nama@perusahaan.com" })}
          aria-label={t({ en: "Account email", id: "Email akun" })}
        />
        <button type="submit" className={PRIMARY} disabled={busy || !email.trim()}>
          <UserPlus className="h-4 w-4" /> {t({ en: "Add", id: "Tambah" })}
        </button>
      </form>
      {error && <p className="mb-2 text-[12px] text-[#C4342F]">{error}</p>}
      {members === null ? (
        <p className="text-[12px] text-neutral-400">{t({ en: "Loading...", id: "Memuat..." })}</p>
      ) : members.length === 0 ? (
        <p className="text-[12px] text-neutral-400">{t({ en: "No account has access yet.", id: "Belum ada akun yang punya akses." })}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#0B6477]/8">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-neutral-800">{m.full_name || m.email}</div>
                <div className="truncate text-[11px] text-neutral-500">
                  {m.email}
                  {m.status && m.status !== "active" ? ` · ${m.status}, ${t({ en: "not approved yet", id: "belum disetujui" })}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void remove(m)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-[#C4342F]/8 hover:text-[#C4342F]"
                aria-label={t({ en: `Remove ${m.email}`, id: `Hapus ${m.email}` })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
