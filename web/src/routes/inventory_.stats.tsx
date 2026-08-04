import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { body } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { supabase } from "../lib/auth/supabase";
import { useAuth } from "../lib/auth/auth";
import { type Instrument, type UsageLog } from "../lib/inventory";
import { computeInventoryStats } from "../lib/inventory-stats";
import {
  ActivityFeed,
  BarList,
  BigStatCard,
  Card,
  CurrentlyOutPanel,
  GaugeCard,
  Heading2,
  KpiCard,
  MonthlyChart,
  StatusBreakdown,
} from "../components/InventoryStats";

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

  // Stable "now" per data load so relative times don't drift each render.
  const now = useMemo(() => new Date(), [logs]);
  const s = useMemo(
    () => computeInventoryStats(instruments, logs, now),
    [instruments, logs, now],
  );

  const avgDuration =
    s.avgDurationDays == null ? null : `${s.avgDurationDays.toFixed(1)}`;

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
          <div className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3" style={body}>
            PUAPT · WGFS
          </div>
          <Heading2 pre="Usage" hi="statistics" />
        </div>

        {error ? (
          <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-8 text-center text-neutral-500 text-sm" style={body}>
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* A. KPI cards with month-over-month delta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Log entries this month" value={s.totalEntries.current} delta={s.totalEntries} loading={loading} />
              <KpiCard label="Instruments used" value={s.instrumentsUsed.current} delta={s.instrumentsUsed} tone="#14919B" loading={loading} />
              <KpiCard label="People involved" value={s.peopleInvolved.current} delta={s.peopleInvolved} tone="#0B6477" loading={loading} />
              <KpiCard label="Currently out" value={s.currentlyOut} tone="#F59E0B" loading={loading} />
            </div>

            {/* B. rate cards */}
            <div className="grid sm:grid-cols-3 gap-6">
              <GaugeCard
                title="On-time return rate"
                pct={s.onTime.pct}
                tone="#12B886"
                loading={loading}
                empty="Needs a due date on loans (not recorded yet). Will populate as new checkouts set an expected return."
                sub={s.onTime.hasData ? `${s.onTime.onTime} of ${s.onTime.total} returned on time` : undefined}
              />
              <GaugeCard
                title="Catalog utilisation"
                pct={s.utilization.total ? s.utilization.pct : null}
                tone="#14919B"
                loading={loading}
                empty="No borrowable instruments."
                sub={`${s.utilization.used} of ${s.utilization.total} borrowable instruments used at least once`}
              />
              <BigStatCard
                title="Average loan duration"
                value={avgDuration}
                unit="days"
                loading={loading}
                empty="No returned loans yet."
                sub="Across returned borrows"
              />
            </div>

            {/* time series */}
            <Card title="Activity over time">
              <MonthlyChart data={s.byMonth} loading={loading} />
            </Card>

            {/* C. currently out & overdue */}
            <CurrentlyOutPanel rows={s.currentlyOutRows} overdueCount={s.overdueCount} loading={loading} />

            {/* D + E */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ActivityFeed events={s.recentActivity} now={now} loading={loading} />
              <StatusBreakdown rows={s.statusBreakdown} loading={loading} />
            </div>

            {/* most-used vs underused */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Most-used instruments">
                <BarList rows={s.mostUsed} color="#0B6477" loading={loading} empty="No borrows yet." />
              </Card>
              <Card title="Underused instruments">
                <BarList rows={s.underused} color="#8A94A6" loading={loading} empty="No borrowable instruments." />
              </Card>
            </div>

            {/* lab / category */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Activity by lab / location">
                <BarList rows={s.byLab} color="#14919B" loading={loading} />
              </Card>
              <Card title="Activity by category">
                <BarList rows={s.byCategory} color="#0AD1C8" loading={loading} />
              </Card>
            </div>

            {/* people */}
            <Card title="Most active people">
              <BarList rows={s.topPeople} color="#0B6477" loading={loading} />
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
