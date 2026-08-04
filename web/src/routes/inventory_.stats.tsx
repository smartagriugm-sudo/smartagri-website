import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { supabase } from "../lib/auth/supabase";
import { useAuth } from "../lib/auth/auth";
import { type Instrument, type UsageLog } from "../lib/inventory";

export const Route = createFileRoute("/inventory_/stats")({
  component: StatsPage,
  head: () => ({
    meta: [
      { title: "Inventory Statistics | smartagri" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function StatsPage() {
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
      <StatsContent />
      <Footer />
    </main>
  );
}

type Row = { label: string; value: number; extra?: string };

function StatsContent() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("Inventory storage is not configured on this environment.");
      setLoading(false);
      return;
    }
    (async () => {
      const [inst, lg] = await Promise.all([
        supabase.from("instruments").select("*"),
        supabase.from("usage_logs").select("*").limit(20000),
      ]);
      if (!active) return;
      if (inst.error || lg.error) {
        setError(inst.error?.message || lg.error?.message || "Failed to load");
      } else {
        setInstruments((inst.data ?? []) as Instrument[]);
        setLogs((lg.data ?? []) as UsageLog[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const byId = new Map(instruments.map((i) => [i.id, i]));
    const norm = (s: string) => s.trim().replace(/\s+/g, " ");

    const kpi = {
      borrows: logs.length,
      instrumentsUsed: new Set(logs.map((l) => l.instrument_id)).size,
      borrowers: new Set(logs.map((l) => norm(l.borrower_name || ""))).size,
      ongoing: logs.filter((l) => l.status === "ongoing").length,
    };

    const tally = (keyFn: (l: UsageLog) => string | null | undefined) => {
      const m = new Map<string, number>();
      for (const l of logs) {
        const k = keyFn(l);
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    };

    const byInstrument = tally((l) => byId.get(l.instrument_id)?.name).slice(0, 12);
    const byBorrower = tally((l) => norm(l.borrower_name || "")).slice(0, 10);
    const byLab = tally((l) => byId.get(l.instrument_id)?.lab || "Unknown");
    const byCategory = tally((l) => byId.get(l.instrument_id)?.category || "Uncategorized");

    // usage per month, chronological
    const monthMap = new Map<string, number>();
    for (const l of logs) {
      const d = new Date(l.checkout_at);
      if (isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(k, (monthMap.get(k) ?? 0) + 1);
    }
    const byMonth = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        const [y, m] = k.split("-");
        const label = new Date(+y, +m - 1, 1).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        return { label, value: v } as Row;
      });

    return { kpi, byInstrument, byBorrower, byLab, byCategory, byMonth };
  }, [instruments, logs]);

  return (
    <section className="bg-white">
      <div className="max-w-[1120px] mx-auto px-6 md:px-12 pt-10 md:pt-14 pb-16 md:pb-24">
        <Link
          to="/inventory"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline mb-8"
          style={body}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inventory
        </Link>

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
            Usage <span style={accent}>statistics</span>
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-8 text-center text-neutral-500 text-sm" style={body}>
            {error}
          </div>
        ) : stats.kpi.borrows === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-8 text-center text-neutral-500 text-sm" style={body}>
            No activity has been logged yet. Statistics will appear here once instruments are used or inspected.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi label="Total log entries" value={stats.kpi.borrows} />
              <Kpi label="Instruments used" value={stats.kpi.instrumentsUsed} tone="#14919B" />
              <Kpi label="People involved" value={stats.kpi.borrowers} tone="#0B6477" />
              <Kpi label="Currently out" value={stats.kpi.ongoing} tone="#F59E0B" />
            </div>

            {/* time series */}
            <Card title="Activity over time">
              <MonthlyChart data={stats.byMonth} />
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Most-used instruments">
                <BarList rows={stats.byInstrument} />
              </Card>
              <Card title="Most active people">
                <BarList rows={stats.byBorrower} color="#0B6477" />
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Activity by lab / location">
                <BarList rows={stats.byLab} color="#14919B" />
              </Card>
              <Card title="Activity by category">
                <BarList rows={stats.byCategory} color="#0AD1C8" />
              </Card>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] px-4 py-4">
      <div
        className="text-3xl font-semibold tracking-[-0.03em] tabular-nums"
        style={{ ...display, color: tone }}
      >
        {value}
      </div>
      <div className="text-xs font-normal text-neutral-500 mt-1" style={body}>
        {label}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#0B6477]/12 bg-white p-6 shadow-[0_1px_2px_rgba(8,49,58,0.04),0_8px_24px_rgba(8,49,58,0.05)]">
      <h2
        className="text-base font-medium text-neutral-900 mb-5"
        style={display}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function BarList({ rows, color = "#14919B" }: { rows: Row[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-400" style={body}>No data.</p>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div
            className="w-[42%] shrink-0 text-sm text-neutral-700 truncate"
            style={body}
            title={r.label}
          >
            {r.label}
          </div>
          <div className="flex-1 h-6 rounded-md bg-[#F3F7F6] overflow-hidden">
            <div
              className="h-full rounded-md"
              style={{ width: `${(r.value / max) * 100}%`, backgroundColor: color, minWidth: 6 }}
            />
          </div>
          <div
            className="w-8 shrink-0 text-right text-sm font-medium text-neutral-800 tabular-nums"
            style={body}
          >
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ data }: { data: Row[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400" style={body}>No data.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end gap-2 h-56"
        style={{ minWidth: data.length * 40 }}
      >
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 min-w-[30px] h-full flex flex-col items-center"
          >
            <div
              className="text-[11px] font-medium text-neutral-500 tabular-nums mb-1"
              style={body}
            >
              {d.value}
            </div>
            {/* flex-1 track gives the bar a real height to scale against */}
            <div className="flex-1 w-full flex items-end min-h-0">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#0B6477] to-[#45DFB1] transition-[height]"
                style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <div
              className="text-[10px] text-neutral-400 whitespace-nowrap mt-1.5"
              style={body}
            >
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
