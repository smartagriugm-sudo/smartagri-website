import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Check, ChevronLeft, ChevronRight, ChevronsUpDown, ExternalLink, Loader2, Lock, Search, Users, X } from "lucide-react";
import { accent, body, display } from "../../lib/fonts";
import { useAuth } from "../../lib/auth/auth";
import { labRoleLabel } from "../../lib/account";
import { loadSites, type EdgeSite } from "../../lib/edge/field";
import { roleLabel } from "../../lib/pf/foundation";
import {
  approveAccount,
  loadAccessRows,
  rejectAccount,
  setGreenhouseSite,
  setIndoor,
  setPlantFactoryRead,
  accessAdminErrorText,
  type AccessRow,
} from "../../lib/agrosphere-admin";
import { useLang, useT, type Bi } from "../../lib/i18n";
import AgroHeader from "./AgroHeader";

// The access page: one question, "who can open what?". Waiting accounts come
// first, since nothing else happens for them until they are approved; then every
// account with its three permissions side by side, changed in place. A change is
// shown at once and put back if the database refuses it (the partner guards, for
// instance), with the reason on screen.

const EASE = [0.22, 1, 0.36, 1] as const;
type Filter = "all" | "researchers" | "partners" | "inactive";
const FILTERS: { key: Filter; label: Bi }[] = [
  { key: "all", label: { en: "Everyone active", id: "Semua yang aktif" } },
  { key: "researchers", label: { en: "Researchers", id: "Peneliti" } },
  { key: "partners", label: { en: "Partners", id: "Mitra" } },
  { key: "inactive", label: { en: "Inactive", id: "Nonaktif" } },
];
const PAGE_SIZES = [10, 25, 50];
type SortKey = "name" | "role";
type Sort = { key: SortKey; dir: "asc" | "desc" };

// Same table language as the site's own tables (StudentsTable on the team page):
// one rounded panel, a toolbar, a tinted header band with small caps that sort,
// a hover highlight with a teal edge, and a pager at the foot.
const GRID =
  "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)_76px] lg:items-center lg:gap-5";
const controlClass =
  "h-10 rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-700 outline-none transition-colors focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";
const avatarTint = ["bg-[#0B6477]", "bg-[#14919B]", "bg-[#08313A]", "bg-[#45DFB1] text-[#08313A]"];
const collator = new Intl.Collator("id", { sensitivity: "base" });
const roleRank = (r: AccessRow) => (r.is_admin ? 0 : isPartner(r) ? 2 : 1);

function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-[#45DFB1]/40 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const isPartner = (r: AccessRow) => r.lab_role === "mitra";
const nameOf = (r: AccessRow) => r.full_name || r.email.split("@")[0];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function AccessSettings() {
  const { account } = useAuth();
  const lang = useLang();
  const t = useT();
  if (account && !account.isAdmin) {
    return (
      <Page>
        <div className="mx-auto mt-16 max-w-[440px] text-center">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08313A]">
            <Lock className="h-5 w-5 text-[#45DFB1]" />
          </span>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
            {lang === "id" ? (
              <>
                Khusus <span style={accent}>admin</span> lab
              </>
            ) : (
              <>
                For lab <span style={accent}>admins</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-[15px] leading-[1.5] text-neutral-500">
            {t({
              en: "Only a smartagri lab admin can change who opens which dashboard.",
              id: "Hanya admin lab smartagri yang dapat mengubah siapa yang membuka dashboard mana.",
            })}
          </p>
          <Link to="/agrosphere" className="mt-6 inline-flex rounded-xl bg-[#45DFB1] px-5 py-3 text-[15px] font-medium text-[#0B2A22] hover:bg-[#80ED99]">
            {t({ en: "Back to your dashboards", id: "Kembali ke dashboard Anda" })}
          </Link>
        </div>
      </Page>
    );
  }
  return (
    <Page>
      <AccessBoard />
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#EEF3F1]" style={body}>
      <AgroHeader />
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-14 sm:px-6">{children}</div>
    </main>
  );
}

function AccessBoard() {
  const [rows, setRows] = useState<AccessRow[] | null>(null);
  const [sites, setSites] = useState<EdgeSite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const { isConfigured } = useAuth();
  const sample = !isConfigured && import.meta.env.DEV;
  const lang = useLang();
  const t = useT();

  const reload = async () => {
    if (sample) {
      setRows(SAMPLE_ROWS);
      setSites(SAMPLE_SITES);
      return;
    }
    const [a, s] = await Promise.all([loadAccessRows(), loadSites()]);
    setRows(a.data);
    setSites(s.data);
    setError(a.error ?? s.error);
  };
  useEffect(() => {
    void reload();
  }, []);

  // Show a change at once; put it back if the database says no.
  const change = async (key: string, userId: string, patch: (r: AccessRow) => AccessRow, run: () => Promise<{ error: string | null }>) => {
    const before = rows;
    setRows((rs) => rs?.map((r) => (r.user_id === userId ? patch(r) : r)) ?? rs);
    setBusy((b) => new Set(b).add(key));
    setError(null);
    const r = await run();
    setBusy((b) => {
      const n = new Set(b);
      n.delete(key);
      return n;
    });
    if (r.error) {
      setRows(before);
      setError(r.error);
    }
  };

  const pending = useMemo(() => (rows ?? []).filter((r) => r.status === "pending"), [rows]);
  const active = (rows ?? []).filter((r) => r.status === "active");
  const partners = active.filter(isPartner).length;
  const summary =
    lang === "id"
      ? !rows
        ? "Membaca semua akun..."
        : pending.length
          ? `${pending.length} akun menunggu persetujuan. ${active.length - partners} peneliti dan ${partners} mitra aktif.`
          : `Tidak ada akun yang menunggu. ${active.length - partners} peneliti dan ${partners} mitra aktif.`
      : !rows
        ? "Reading every account..."
        : pending.length
          ? `${plural(pending.length, "account is", "accounts are")} waiting for approval. ${plural(active.length - partners, "researcher")} and ${plural(partners, "partner")} are active.`
          : `No account is waiting. ${plural(active.length - partners, "researcher")} and ${plural(partners, "partner")} are active.`;

  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="pt-6 sm:pt-10">
        <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 sm:text-[40px]" style={display}>
          {lang === "id" ? (
            <>
              Akses <span style={accent}>dashboard</span>
            </>
          ) : (
            <>
              Dashboard <span style={accent}>access</span>
            </>
          )}
        </h1>
        <p className="mt-3 max-w-[640px] text-[16px] leading-[1.5] text-neutral-600">{summary}</p>
        {sample && (
          <p className="mt-2 text-[13px] text-[#8A5A07]">
            {t({
              en: "Sample accounts, development only. Changes are not saved.",
              id: "Akun contoh, hanya untuk pengembangan. Perubahan tidak disimpan.",
            })}
          </p>
        )}
      </motion.section>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-5 flex items-start justify-between gap-3 rounded-2xl bg-[#FDECEC] px-4 py-3 text-[14px] text-[#9B2C2C]"
          >
            {accessAdminErrorText(error, lang)}
            <button type="button" onClick={() => setError(null)} aria-label={t({ en: "Dismiss", id: "Tutup" })} className="shrink-0 rounded-full p-1 hover:bg-white/60">
              <X className="h-4 w-4" />
            </button>
          </motion.p>
        )}
      </AnimatePresence>

      {rows === null ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" /> {t({ en: "Loading accounts...", id: "Memuat akun..." })}
        </div>
      ) : (
        <>
          {pending.length > 0 && <PendingList rows={pending} sites={sites} onDone={reload} onError={setError} />}

          <section className="mt-8" aria-label={t({ en: "Accounts", id: "Akun" })}>
            <AccountsTable rows={rows} sites={sites} busy={busy} change={change} />
            <p className="mt-3 text-[13px] text-neutral-500">
              {t({
                en: "Plant Factory read access is the ERP role Researchers and students. Other ERP roles are set in ",
                id: "Akses baca Plant Factory adalah peran ERP Peneliti dan mahasiswa. Peran ERP lainnya diatur di ",
              })}
              <Link to="/erp/settings/roles" className="font-medium text-[#0B6477] hover:underline">
                {t({ en: "the ERP's roles page", id: "halaman peran ERP" })}
              </Link>
              {t({
                en: ". Partners never get the Plant Factory or Indoor; the database refuses it.",
                id: ". Mitra tidak pernah mendapat Plant Factory atau Indoor; database menolaknya.",
              })}
            </p>
          </section>
        </>
      )}
    </>
  );
}

/* --------------------------------------------------------------- pending */

function PendingList({ rows, sites, onDone, onError }: { rows: AccessRow[]; sites: EdgeSite[]; onDone: () => Promise<void>; onError: (e: string) => void }) {
  const t = useT();
  return (
    <section className="mt-8" aria-labelledby="pending-heading">
      <h2 id="pending-heading" className="text-[20px] font-medium tracking-[-0.02em] text-neutral-900" style={display}>
        {t({ en: "Waiting for approval", id: "Menunggu persetujuan" })}
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((r, i) => (
          <motion.li key={r.user_id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}>
            <PendingCard row={r} sites={sites} onDone={onDone} onError={onError} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function PendingCard({ row, sites, onDone, onError }: { row: AccessRow; sites: EdgeSite[]; onDone: () => Promise<void>; onError: (e: string) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [working, setWorking] = useState<"approve" | "reject" | null>(null);
  const partner = isPartner(row);
  const t = useT();

  const act = async (kind: "approve" | "reject") => {
    const ask = t({
      en: `Reject ${nameOf(row)}? They will not be able to sign in to the tools.`,
      id: `Tolak ${nameOf(row)}? Akun ini tidak akan bisa masuk ke alat-alat lab.`,
    });
    if (kind === "reject" && !window.confirm(ask)) return;
    setWorking(kind);
    const r = kind === "approve" ? await approveAccount(row, picked) : await rejectAccount(row.user_id);
    if (r.error) {
      onError(r.error);
      setWorking(null);
      return;
    }
    await onDone();
  };

  return (
    <div className="flex h-full flex-col rounded-[22px] border border-[#14919B]/20 bg-[#E3F4EE] p-5">
      <AccountIdentity row={row} />
      {partner && sites.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] text-neutral-600">
            {t({ en: "Greenhouse sites to share on approval", id: "Lokasi greenhouse yang dibagikan saat disetujui" })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sites.map((s) => (
              <SiteChip
                key={s.id}
                site={s}
                on={picked.includes(s.id)}
                onToggle={() => setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))}
              />
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto flex gap-2 pt-5">
        <button
          type="button"
          onClick={() => void act("approve")}
          disabled={!!working}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-4 text-[15px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] active:scale-[0.98] disabled:opacity-60"
        >
          {working === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t({ en: "Approve", id: "Setujui" })}
        </button>
        <button
          type="button"
          onClick={() => void act("reject")}
          disabled={!!working}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 text-[15px] font-medium text-neutral-600 transition-colors hover:text-[#9B2C2C] active:scale-[0.98] disabled:opacity-60"
        >
          {working === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          {t({ en: "Reject", id: "Tolak" })}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ rows */

type Change = (key: string, userId: string, patch: (r: AccessRow) => AccessRow, run: () => Promise<{ error: string | null }>) => Promise<void>;

function AccountsTable({ rows, sites, busy, change }: { rows: AccessRow[]; sites: EdgeSite[]; busy: Set<string>; change: Change }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "role", dir: "asc" });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const t = useT();

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sign = sort.dir === "asc" ? 1 : -1;
    return rows
      .filter((r) => r.status !== "pending")
      .filter((r) =>
        filter === "inactive"
          ? r.status === "suspended" || r.status === "rejected"
          : r.status === "active" && (filter === "all" || (filter === "partners") === isPartner(r)),
      )
      .filter((r) => !q || `${r.full_name} ${r.email}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          (sort.key === "name" ? collator.compare(nameOf(a), nameOf(b)) : roleRank(a) - roleRank(b)) * sign ||
          collator.compare(nameOf(a), nameOf(b)),
      );
  }, [rows, filter, query, sort]);

  useEffect(() => setPage(0), [filter, query, sort, pageSize]);
  const pages = Math.max(1, Math.ceil(listed.length / pageSize));
  const current = Math.min(page, pages - 1);
  const view = listed.slice(current * pageSize, current * pageSize + pageSize);
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const activeCount = rows.filter((r) => r.status === "active").length;

  const headers: { label: Bi; sort?: SortKey }[] = [
    { label: { en: "Account", id: "Akun" }, sort: "name" },
    { label: { en: "Role", id: "Peran" }, sort: "role" },
    { label: { en: "Plant Factory", id: "Plant Factory" } },
    { label: { en: "Greenhouse sites", id: "Lokasi greenhouse" } },
    { label: { en: "Indoor", id: "Indoor" } },
  ];

  return (
    <div className="overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-white/90 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)]">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-[#0B6477]/10 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#0B6477]/15 bg-[#F3F7F6] text-[#0B6477]">
            <Users className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-[-0.02em] text-neutral-900" style={display}>
              {t({ en: "Accounts", id: "Akun" })}
            </span>
            <span className="block text-[13px] text-neutral-500">
              {t({
                en: `${activeCount} active, ${sites.length} greenhouse ${sites.length === 1 ? "site" : "sites"} to share`,
                id: `${activeCount} aktif, ${sites.length} lokasi greenhouse untuk dibagikan`,
              })}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t({ en: "Search accounts...", id: "Cari akun..." })}
              aria-label={t({ en: "Search accounts", id: "Cari akun" })}
              className={`${controlClass} w-full pl-9`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label={t({ en: "Show", id: "Tampilkan" })} className={`${controlClass} w-full min-w-0 px-2 md:w-auto md:px-3`}>
              {FILTERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {t(f.label)}
                </option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={t({ en: "Accounts per page", id: "Akun per halaman" })}
              className={`${controlClass} w-full min-w-0 px-2 md:w-auto md:px-3`}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {t({ en: `Show ${n}`, id: `Tampilkan ${n}` })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className={`hidden border-b border-[#0B6477]/10 bg-[#F3F7F6]/70 px-6 py-3 lg:grid ${GRID}`}>
        {headers.map((h) => {
          const active = h.sort && sort.key === h.sort;
          const cls = "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]";
          return h.sort ? (
            <button
              key={h.label.en}
              type="button"
              onClick={() => toggleSort(h.sort!)}
              aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
              className={`${cls} transition-colors ${active ? "text-[#0B6477]" : "text-neutral-400 hover:text-neutral-700"}`}
            >
              {t(h.label)}
              {active ? (
                <motion.span animate={{ rotate: sort.dir === "asc" ? 180 : 0 }} transition={{ duration: 0.3, ease: EASE }} className="inline-flex text-[#14919B]">
                  <ArrowDown className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          ) : (
            <span key={h.label.en} className={`${cls} text-neutral-400`}>
              {t(h.label)}
            </span>
          );
        })}
      </div>

      {/* Rows */}
      <div onMouseLeave={() => setHovered(null)}>
        {view.length === 0 ? (
          <p className="px-6 py-14 text-center text-neutral-500">
            {t({ en: "No account matches your search.", id: "Tidak ada akun yang cocok dengan pencarian." })}
          </p>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={`${current}-${sort.key}-${sort.dir}-${filter}-${pageSize}-${query}`}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              variants={{ show: { transition: { staggerChildren: 0.025 } } }}
            >
              {view.map((r, i) => (
                <motion.li
                  key={r.user_id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
                  onMouseEnter={() => setHovered(r.user_id)}
                  className="relative border-b border-[#0B6477]/8 last:border-b-0"
                >
                  {hovered === r.user_id && (
                    <motion.span layoutId="access-row-hover" className="absolute inset-0 bg-[#F3F7F6]" transition={{ type: "spring", stiffness: 500, damping: 40 }}>
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-[#14919B]" />
                    </motion.span>
                  )}
                  <AccountRow row={r} tint={avatarTint[(current * pageSize + i) % avatarTint.length]} query={query} sites={sites} busy={busy} change={change} />
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0B6477]/10 bg-[#F3F7F6]/60 px-5 py-4 md:px-6">
        <span className="text-[13px] text-neutral-500">
          <span className="font-semibold tabular-nums text-neutral-900">{listed.length}</span> {t({ en: "results", id: "hasil" })}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label={t({ en: "Previous page", id: "Halaman sebelumnya" })}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#0B6477]/15 bg-white text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1] disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[96px] text-center text-[13px] tabular-nums text-neutral-600">
            {t({ en: "Page", id: "Halaman" })}{" "}
            <motion.span key={current} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-neutral-900">
              {current + 1}
            </motion.span>{" "}
            {t({ en: "of", id: "dari" })} {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            aria-label={t({ en: "Next page", id: "Halaman berikutnya" })}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#0B6477]/15 bg-white text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1] disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountRow({
  row,
  tint,
  query,
  sites,
  busy,
  change,
}: {
  row: AccessRow;
  tint: string;
  query: string;
  sites: EdgeSite[];
  busy: Set<string>;
  change: Change;
}) {
  const partner = isPartner(row);
  const inactive = row.status !== "active";
  const pfRead = row.pf_roles.includes("peneliti");
  const otherPf = row.pf_roles.filter((r) => r !== "peneliti");
  const lang = useLang();
  const t = useT();

  return (
    <div className={`relative px-5 py-4 md:px-6 ${GRID} ${inactive ? "opacity-60" : ""}`}>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white ${tint}`} aria-hidden="true">
          {initials(nameOf(row))}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-neutral-900">
            <Highlight text={nameOf(row)} query={query} />
          </span>
          <span className="block truncate text-[12px] text-neutral-500">
            <Highlight text={row.email} query={query} />
          </span>
        </span>
      </span>

      <Cell label={t({ en: "Role", id: "Peran" })}>
        <RolePill row={row} />
      </Cell>

      {row.is_admin ? (
        <p className="text-[13px] text-neutral-500 lg:col-span-3">
          {t({ en: "Opens every dashboard and every site.", id: "Membuka semua dashboard dan semua lokasi." })}
        </p>
      ) : (
        <>
          <Cell label="Plant Factory">
            {partner ? (
              <Muted>{t({ en: "Not for partners", id: "Bukan untuk mitra" })}</Muted>
            ) : otherPf.length ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] text-neutral-700">{otherPf.map((k) => roleLabel(k, lang)).join(", ")}</span>
                <Link to="/erp/settings/roles" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
                  {t({ en: "Edit", id: "Ubah" })} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <Toggle
                on={pfRead}
                busy={busy.has(`pf-${row.user_id}`)}
                disabled={inactive}
                label={t({
                  en: `Plant Factory read access for ${nameOf(row)}`,
                  id: `Akses baca Plant Factory untuk ${nameOf(row)}`,
                })}
                caption={pfRead ? t({ en: "Read", id: "Baca" }) : t({ en: "None", id: "Tidak ada" })}
                onChange={(on) =>
                  void change(
                    `pf-${row.user_id}`,
                    row.user_id,
                    (r) => ({ ...r, pf_roles: on ? [...r.pf_roles, "peneliti"] : r.pf_roles.filter((x) => x !== "peneliti") }),
                    () => setPlantFactoryRead(row.user_id, on),
                  )
                }
              />
            )}
          </Cell>

          <Cell label={t({ en: "Greenhouse sites", id: "Lokasi greenhouse" })}>
            {sites.length === 0 ? (
              <Muted>{t({ en: "No site registered yet", id: "Belum ada lokasi terdaftar" })}</Muted>
            ) : (
              <div className="flex flex-wrap gap-1.5 lg:justify-start">
                {sites.map((s) => {
                  const on = row.greenhouse_sites.includes(s.id);
                  const key = `gh-${row.user_id}-${s.id}`;
                  return (
                    <SiteChip
                      key={s.id}
                      site={s}
                      on={on}
                      busy={busy.has(key)}
                      disabled={inactive}
                      onToggle={() =>
                        void change(
                          key,
                          row.user_id,
                          (r) => ({ ...r, greenhouse_sites: on ? r.greenhouse_sites.filter((x) => x !== s.id) : [...r.greenhouse_sites, s.id] }),
                          () => setGreenhouseSite(s.id, row, !on),
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </Cell>

          <Cell label="Indoor">
            {partner ? (
              <Muted>{t({ en: "Not for partners", id: "Bukan untuk mitra" })}</Muted>
            ) : (
              <Toggle
                on={row.indoor}
                busy={busy.has(`in-${row.user_id}`)}
                disabled={inactive}
                label={t({ en: `Indoor access for ${nameOf(row)}`, id: `Akses Indoor untuk ${nameOf(row)}` })}
                onChange={(on) =>
                  void change(
                    `in-${row.user_id}`,
                    row.user_id,
                    (r) => ({ ...r, indoor: on }),
                    () => setIndoor(row.user_id, on),
                  )
                }
              />
            )}
          </Cell>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- parts */

// Pills in the site's own scale: dark for admins, mint for researchers, an
// outline for partners (StudentsTable uses the same three for its levels).
function RolePill({ row }: { row: AccessRow }) {
  const partner = isPartner(row);
  const lang = useLang();
  const t = useT();
  const label = row.is_admin
    ? t({ en: "Lab admin", id: "Admin lab" })
    : partner
      ? t({ en: "Partner", id: "Mitra" })
      : labRoleLabel(row.lab_role, lang) || t({ en: "Researcher", id: "Peneliti" });
  const cls = row.is_admin
    ? "bg-[#08313A] text-[#45DFB1]"
    : partner
      ? "border border-[#0B6477]/15 bg-white text-neutral-600"
      : "bg-[#45DFB1]/25 text-[#0B6477]";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${cls}`}>{label}</span>
      {row.status === "suspended" || row.status === "rejected" ? (
        <span className="text-[12px] text-neutral-500">{row.status === "suspended" ? t({ en: "Suspended", id: "Ditangguhkan" }) : t({ en: "Rejected", id: "Ditolak" })}</span>
      ) : null}
    </span>
  );
}

function AccountIdentity({ row }: { row: AccessRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#08313A] text-[13px] font-semibold text-[#45DFB1]" aria-hidden="true">
        {initials(nameOf(row))}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-medium text-neutral-900">{nameOf(row)}</span>
          <RolePill row={row} />
        </div>
        <span className="block truncate text-[13px] text-neutral-500">{row.email}</span>
      </div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 lg:block">
      <span className="text-[12px] text-neutral-500 lg:hidden">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-[13px] text-neutral-400">{children}</span>;
}

function Toggle({
  on,
  busy = false,
  disabled = false,
  label,
  caption,
  onChange,
}: {
  on: boolean;
  busy?: boolean;
  disabled?: boolean;
  label: string;
  caption?: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled || busy}
      onClick={() => onChange(!on)}
      className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#45DFB1]/40 disabled:cursor-not-allowed"
    >
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${on ? "bg-[#14919B]" : "bg-[#0B6477]/15"} ${disabled ? "opacity-50" : ""}`}>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(8,49,58,0.25)] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin text-[#0B6477]" />}
        </span>
      </span>
      {caption && <span className="text-[13px] text-neutral-600">{caption}</span>}
    </button>
  );
}

function SiteChip({ site, on, busy = false, disabled = false, onToggle }: { site: EdgeSite; on: boolean; busy?: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled || busy}
      onClick={onToggle}
      title={site.location || site.name}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 ${
        on ? "border-[#14919B] bg-[#14919B] text-white" : "border-[#0B6477]/15 bg-white text-neutral-600 hover:border-[#14919B]/50 hover:text-[#0B6477]"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : on ? <Check className="h-3.5 w-3.5" /> : null}
      {site.name}
    </button>
  );
}

/* ------------------------------------------------------- development only */

// Shown only by `npm run dev` without Supabase settings, so the page can be seen
// at full density. Never on a deployment with settings.
const SAMPLE_SITES: EdgeSite[] = [
  { id: "s1", code: "sgh-grabag", name: "SGH Grabag", location: "Grabag, Magelang", interval_s: 600, last_seen_at: null },
  { id: "s2", code: "lab-ugm", name: "Lab UGM", location: "Yogyakarta", interval_s: 600, last_seen_at: null },
];
const sampleRow = (id: string, full_name: string, email: string, lab_role: string, extra: Partial<AccessRow> = {}): AccessRow => ({
  user_id: id,
  email,
  full_name,
  lab_role,
  status: "active",
  is_admin: false,
  pf_roles: [],
  greenhouse_sites: [],
  indoor: false,
  ...extra,
});
const SAMPLE_ROWS: AccessRow[] = [
  sampleRow("u1", "Admin Sample", "admin@example.com", "dosen", { is_admin: true }),
  sampleRow("u2", "Researcher One", "researcher.one@example.com", "peneliti", { pf_roles: ["peneliti"], greenhouse_sites: ["s1"], indoor: true }),
  sampleRow("u3", "Operator Two", "operator.two@example.com", "staf", { pf_roles: ["operator"] }),
  sampleRow("u4", "Student Three", "student.three@example.com", "s2"),
  sampleRow("u5", "Partner Four", "partner.four@example.com", "mitra", { greenhouse_sites: ["s1"] }),
  sampleRow("u6", "New Partner", "new.partner@example.com", "mitra", { status: "pending" }),
];
