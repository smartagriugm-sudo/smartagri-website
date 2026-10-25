import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import AuthGate from "../components/AuthGate";
import { MaskLine, META } from "../components/NoteParts";
import { supabase } from "../lib/auth/supabase";
import { type Instrument, type UsageLog } from "../lib/inventory";
import { computeInventoryStats } from "../lib/inventory-stats";
import {
  ActivityFeed,
  BarList,
  BigStatCard,
  Card,
  CurrentlyOutPanel,
  GaugeCard,
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
  return (
    <AuthGate>
      <MotionConfig reducedMotion="user">
        <main>
          <SiteHeader />
          <div className="relative overflow-clip bg-white">
            <AmbientWash count={6} />
            <div className="relative">
              <StatsContent />
            </div>
          </div>
          <Footer />
        </main>
      </MotionConfig>
    </AuthGate>
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
    <section>
      <div className="mx-auto max-w-[1360px] px-6 pb-20 pt-10 md:px-12 md:pb-28 md:pt-12">
        <Link
          to="/inventory"
          className={`group mb-10 inline-flex items-center gap-2 text-neutral-600 hover:text-[#0B6477] ${META}`}
          style={body}
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to inventory
        </Link>

        <div className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className={`flex items-center gap-2 text-[#14919B] ${META}`} style={body}>
              <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
              PUAPT · WGFS
            </p>
            <motion.h1
              initial="hidden"
              animate="show"
              className="mt-5 text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px]"
              style={display}
            >
              <MaskLine delay={0}>Usage</MaskLine>
              <MaskLine delay={0.12}>
                <span style={accent}>statistics.</span>
              </MaskLine>
            </motion.h1>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="text-base leading-relaxed text-neutral-600 md:text-lg lg:col-span-4"
            style={body}
          >
            How the instruments are being used: this month against the last, what is out right now,
            and which instruments, labs and people log the most activity.
          </motion.p>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-dashed border-[#0B6477]/25 bg-white/70 p-8 text-center text-neutral-500 text-sm" style={body}>
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-5 md:gap-6">
            {/* A. This month at a glance, with month-over-month change */}
            <div className="grid grid-cols-2 gap-px overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12 lg:grid-cols-4">
              <KpiCard index={0} label="Log entries this month" value={s.totalEntries.current} delta={s.totalEntries} tone="#0B6477" loading={loading} />
              <KpiCard index={1} label="Instruments used" value={s.instrumentsUsed.current} delta={s.instrumentsUsed} tone="#14919B" loading={loading} />
              <KpiCard index={2} label="People involved" value={s.peopleInvolved.current} delta={s.peopleInvolved} tone="#45DFB1" loading={loading} />
              <KpiCard index={3} label="Currently out" value={s.currentlyOut} tone="#F59E0B" loading={loading} />
            </div>

            {/* B. rates */}
            <div className="grid gap-5 md:grid-cols-3">
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

            {/* time series, on a dark band */}
            <Card title="Activity over time" eyebrow="Log entries per month" dark>
              <MonthlyChart data={s.byMonth} loading={loading} dark />
            </Card>

            {/* C. currently out & overdue */}
            <CurrentlyOutPanel rows={s.currentlyOutRows} overdueCount={s.overdueCount} loading={loading} />

            {/* D + E */}
            <div className="grid gap-5 lg:grid-cols-2">
              <ActivityFeed events={s.recentActivity} now={now} loading={loading} />
              <StatusBreakdown rows={s.statusBreakdown} loading={loading} />
            </div>

            {/* most-used vs underused */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Most-used instruments" eyebrow="Ranking" className="h-full">
                <BarList rows={s.mostUsed} color="#0B6477" loading={loading} empty="No borrows yet." />
              </Card>
              <Card title="Underused instruments" eyebrow="Ranking" className="h-full">
                <BarList rows={s.underused} color="#8A94A6" loading={loading} empty="No borrowable instruments." />
              </Card>
            </div>

            {/* lab / category */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Activity by lab / location" eyebrow="Where" className="h-full">
                <BarList rows={s.byLab} color="#14919B" loading={loading} />
              </Card>
              <Card title="Activity by category" eyebrow="What" className="h-full">
                <BarList rows={s.byCategory} color="#0AD1C8" loading={loading} />
              </Card>
            </div>

            {/* people */}
            <Card title="Most active people" eyebrow="Who">
              <BarList rows={s.topPeople} color="#45DFB1" loading={loading} />
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
