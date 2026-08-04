import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { supabase } from "../lib/auth/supabase";
import { useAuth } from "../lib/auth/auth";
import {
  type Instrument,
  type InstrumentStatus,
  formatIDR,
  statusMeta,
} from "../lib/inventory";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Instrument Inventory | smartagri" },
      // Private, gated internal tool: keep it out of search engines.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function InventoryPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();

  const blocked = isConfigured && !authLoading && !user;
  useEffect(() => {
    if (blocked) {
      const here = router.state.location.pathname;
      window.location.assign(`/sign-in?redirect=${encodeURIComponent(here)}`);
    }
  }, [blocked, router]);

  if (isConfigured && (authLoading || !user)) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6]">
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            <p className="text-sm" style={body}>
              {authLoading ? "Checking access..." : "Redirecting to sign in..."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <SiteHeader />
      <InventoryContent />
      <Footer />
    </main>
  );
}

function InventoryContent() {
  const [rows, setRows] = useState<Instrument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [lab, setLab] = useState("All");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("Inventory storage is not configured on this environment.");
      setLoading(false);
      return;
    }
    supabase
      .from("instruments")
      .select("*")
      .order("ord", { ascending: true, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(err.message);
          setRows(null);
        } else {
          setRows((data ?? []) as Instrument[]);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const labs = useMemo(
    () => ["All", ...uniq((rows ?? []).map((r) => r.lab).filter(Boolean) as string[])],
    [rows],
  );
  const categories = useMemo(
    () =>
      ["All", ...uniq((rows ?? []).map((r) => r.category).filter(Boolean) as string[])],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (lab !== "All" && r.lab !== lab) return false;
      if (category !== "All" && r.category !== category) return false;
      if (status !== "All" && r.status !== status) return false;
      if (q) {
        const hay = `${r.code} ${r.name} ${r.brand ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, lab, category, status]);

  const counts = useMemo(() => {
    const c = { total: rows?.length ?? 0, available: 0, in_use: 0, other: 0 };
    for (const r of rows ?? []) {
      if (r.status === "available") c.available += 1;
      else if (r.status === "in_use") c.in_use += 1;
      else c.other += 1;
    }
    return c;
  }, [rows]);

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-24">
        <div className="mb-8">
          <div
            className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
            style={body}
          >
            PUAPT · WGFS
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-neutral-900"
            style={display}
          >
            Instrument <span style={accent}>inventory</span> and logbook
          </h1>
          <p
            className="mt-4 text-base md:text-lg font-normal text-neutral-500 max-w-[640px] leading-relaxed"
            style={body}
          >
            Track PUAPT research instruments, their status and rates, and log
            every checkout and return. Pick an instrument to see its details and
            usage history.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Instruments" value={counts.total} />
          <Stat label="Available" value={counts.available} tone="#12B886" />
          <Stat label="In use" value={counts.in_use} tone="#14919B" />
          <Stat label="Maintenance / other" value={counts.other} tone="#F59E0B" />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, name, or brand"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#0B6477]/15 bg-[#F3F7F6] text-sm text-neutral-800 outline-none focus:border-[#14919B]"
              style={body}
            />
          </div>
          <Select value={lab} onChange={setLab} options={labs} />
          <Select value={category} onChange={setCategory} options={categories} />
          <Select
            value={status}
            onChange={setStatus}
            options={["All", "available", "in_use", "maintenance", "calibration", "broken"]}
            labelize
          />
        </div>

        {loading ? (
          <Centered>
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
          </Centered>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-8 text-center text-neutral-500 text-sm" style={body}>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-8 text-center text-neutral-500 text-sm" style={body}>
            No instruments match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#0B6477]/10">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-[#F3F7F6] text-neutral-500">
                  <Th>Code</Th>
                  <Th>Instrument</Th>
                  <Th>Lab</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Rate</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = statusMeta[r.status as InstrumentStatus];
                  const rate =
                    r.rate_external ?? r.rate_internal_tech ?? r.rate_internal_self;
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-[#0B6477]/8 hover:bg-[#F3F7F6]/60 transition-colors"
                    >
                      <Td className="whitespace-nowrap font-medium text-neutral-500">
                        {r.code}
                      </Td>
                      <Td>
                        <Link
                          to="/inventory/$slug"
                          params={{ slug: r.slug }}
                          className="font-medium text-neutral-900 hover:text-[#0B6477]"
                        >
                          {r.name}
                        </Link>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {r.brand} · {r.category}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-neutral-600">{r.lab}</Td>
                      <Td>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.chip}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-right text-neutral-700">
                        {formatIDR(rate)}
                        <span className="text-neutral-400"> {r.unit}</span>
                      </Td>
                      <Td className="text-right">
                        <Link
                          to="/inventory/$slug"
                          params={{ slug: r.slug }}
                          className="inline-flex items-center gap-1 text-[#0B6477] text-sm font-medium hover:underline"
                        >
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] px-4 py-3">
      <div
        className="text-2xl font-semibold text-neutral-900"
        style={{ ...display, color: tone }}
      >
        {value}
      </div>
      <div className="text-xs font-normal text-neutral-500 mt-0.5" style={body}>
        {label}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  labelize,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelize?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 px-3 rounded-xl border border-[#0B6477]/15 bg-white text-sm text-neutral-700 outline-none focus:border-[#14919B]"
      style={body}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "All"
            ? "All"
            : labelize
              ? o.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())
              : o}
        </option>
      ))}
    </select>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-16">{children}</div>;
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium ${className}`}
      style={body}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-sm align-top ${className}`} style={body}>
      {children}
    </td>
  );
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}
