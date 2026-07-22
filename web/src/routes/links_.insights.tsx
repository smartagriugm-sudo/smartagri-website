import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  MousePointerClick,
  Eye,
  Percent,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/auth/supabase";
import { useAuth } from "../lib/auth/auth";
import {
  aggregate,
  lastNDays,
  type LinkEventRow,
  type LinkStats,
} from "../lib/links-analytics";

export const Route = createFileRoute("/links_/insights")({
  component: InsightsPage,
  head: () => ({
    meta: [
      { title: "Links Insights | smartagri" },
      // Private, gated dashboard: keep it out of search engines.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const RANGES = [7, 30] as const;
type Range = (typeof RANGES)[number];

function InsightsPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();

  // Gate the page behind sign-in, mirroring the /ai area.
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
      <InsightsContent />
    </main>
  );
}

function InsightsContent() {
  const [range, setRange] = useState<Range>(7);
  const [rows, setRows] = useState<LinkEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Analytics storage is not configured.");
      setLoading(false);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - (range - 1));
    since.setHours(0, 0, 0, 0);

    supabase
      .from("link_events")
      .select("type, link, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(50000)
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(err.message);
          setRows(null);
        } else {
          setRows((data ?? []) as LinkEventRow[]);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range]);

  const stats: LinkStats | null = useMemo(() => {
    if (!rows) return null;
    return aggregate(rows, lastNDays(range, new Date()));
  }, [rows, range]);

  return (
    <section className="bg-[#F3F7F6]">
      <div className="mx-auto max-w-[1000px] px-6 py-14 md:px-10 md:py-20">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a
              href="/links"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#0B6477] hover:text-[#14919B]"
              style={body}
            >
              <ArrowLeft size={15} /> Back to links page
            </a>
            <h1
              style={display}
              className="text-[30px] font-semibold tracking-[-0.03em] text-neutral-900 md:text-[38px]"
            >
              Links <span style={accent}>insights</span>
            </h1>
            <p className="mt-1.5 text-[15px] text-neutral-500" style={body}>
              How your link-in-bio page is performing.
            </p>
          </div>

          {/* Range toggle */}
          <div className="inline-flex rounded-xl border border-[#0B6477]/15 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                style={body}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-[#0B6477] text-white"
                    : "text-neutral-600 hover:bg-[#0B6477]/5"
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
        </div>

        {/* Body states */}
        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-3 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
            <span className="text-sm" style={body}>
              Loading insights...
            </span>
          </div>
        ) : error ? (
          <div
            className="mt-10 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-800"
            style={body}
          >
            Could not load insights: {error}
          </div>
        ) : stats ? (
          <Dashboard stats={stats} range={range} />
        ) : null}
      </div>
    </section>
  );
}

function Dashboard({ stats, range }: { stats: LinkStats; range: Range }) {
  const cards = [
    { icon: Eye, label: "Views", value: stats.totalViews.toLocaleString() },
    {
      icon: MousePointerClick,
      label: "Clicks",
      value: stats.totalClicks.toLocaleString(),
    },
    {
      icon: Percent,
      label: "Click rate",
      value: `${Math.round(stats.clickRate * 100)}%`,
    },
  ];

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="rounded-2xl border border-[#0B6477]/12 bg-white p-5 shadow-[0_1px_2px_rgba(11,100,119,0.04)]"
          >
            <div className="flex items-center gap-2 text-neutral-500">
              <c.icon size={17} className="text-[#14919B]" />
              <span className="text-[13px] font-medium" style={body}>
                {c.label}
              </span>
            </div>
            <div
              className="mt-2 text-[32px] font-semibold tracking-[-0.02em] text-neutral-900 tabular-nums"
              style={display}
            >
              {c.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Daily activity chart */}
      <div className="rounded-2xl border border-[#0B6477]/12 bg-white p-6 shadow-[0_1px_2px_rgba(11,100,119,0.04)]">
        <div className="flex items-center justify-between">
          <h2
            className="text-[15px] font-semibold text-neutral-900"
            style={display}
          >
            Activity, last {range} days
          </h2>
          <Legend />
        </div>
        <ActivityChart stats={stats} />
      </div>

      {/* Per-link breakdown */}
      <div className="rounded-2xl border border-[#0B6477]/12 bg-white p-6 shadow-[0_1px_2px_rgba(11,100,119,0.04)]">
        <h2
          className="text-[15px] font-semibold text-neutral-900"
          style={display}
        >
          Clicks by button
        </h2>
        <PerLink stats={stats} />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-[12.5px] text-neutral-500" style={body}>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#14919B]" /> Views
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#45DFB1]" /> Clicks
      </span>
    </div>
  );
}

function ActivityChart({ stats }: { stats: LinkStats }) {
  const max = Math.max(1, ...stats.days.map((d) => Math.max(d.views, d.clicks)));
  // A few evenly spaced gridline values from 0..max.
  const ticks = 4;

  return (
    <div className="mt-6">
      <div className="flex gap-3">
        {/* Y axis labels */}
        <div className="flex w-6 flex-col justify-between pb-6 text-right text-[11px] text-neutral-400 tabular-nums">
          {Array.from({ length: ticks + 1 }, (_, i) => (
            <span key={i}>{Math.round((max * (ticks - i)) / ticks)}</span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1">
          {/* Gridlines */}
          <div className="absolute inset-0 bottom-6 flex flex-col justify-between">
            {Array.from({ length: ticks + 1 }, (_, i) => (
              <div key={i} className="h-px w-full bg-neutral-100" />
            ))}
          </div>

          {/* Bars */}
          <div className="relative flex h-[200px] items-end gap-2">
            {stats.days.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center justify-end gap-1"
              >
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <Bar value={d.views} max={max} color="#14919B" title={`${d.views} views`} />
                  <Bar value={d.clicks} max={max} color="#45DFB1" title={`${d.clicks} clicks`} />
                </div>
              </div>
            ))}
          </div>

          {/* X axis labels */}
          <div className="flex gap-2">
            {stats.days.map((d) => (
              <div
                key={d.date}
                className="flex-1 pt-2 text-center text-[11px] text-neutral-400"
              >
                {formatDay(d.date)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  value,
  max,
  color,
  title,
}: {
  value: number;
  max: number;
  color: string;
  title: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <motion.div
      title={title}
      initial={{ height: 0 }}
      animate={{ height: `${pct}%` }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[16px] rounded-t-md"
      style={{ backgroundColor: color, minHeight: value > 0 ? 3 : 0 }}
    />
  );
}

function PerLink({ stats }: { stats: LinkStats }) {
  if (stats.perLink.length === 0) {
    return (
      <p className="mt-3 text-sm text-neutral-400" style={body}>
        No clicks recorded yet in this period.
      </p>
    );
  }
  const max = Math.max(1, ...stats.perLink.map((l) => l.clicks));

  return (
    <div className="mt-4 flex flex-col gap-3">
      {stats.perLink.map((l) => (
        <div key={l.link} className="flex items-center gap-3">
          <span
            className="w-28 shrink-0 truncate text-sm text-neutral-700"
            style={body}
          >
            {l.link}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#0B6477]/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(l.clicks / max) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-[#14919B]"
            />
          </div>
          <span
            className="w-8 shrink-0 text-right text-sm font-medium text-neutral-900 tabular-nums"
            style={body}
          >
            {l.clicks}
          </span>
        </div>
      ))}
    </div>
  );
}

/** "Jul 23" from an ISO date, in the viewer's locale. */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
