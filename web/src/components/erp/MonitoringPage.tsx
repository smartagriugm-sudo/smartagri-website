import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { LINK_STATES, MONITORED_PLACES, ago, fetchRecipeTargets, formatBand, formatValue, formatWithUnit, isStale, latestAt, linkStateLabel, metricInfo, metricLabel, metricsAt, placeLabel, rangeState, stripColumns, type PlaceCode, type RangeState } from "../../lib/pf/monitoring";
import { useLang, useT, type Bi } from "../../lib/i18n";
import { conditionsAt } from "../../lib/pf/conditions";
import { useErpStore } from "./ErpContext";
import { DataState, ErpPage, ErrorNote, useLoad } from "./page";
import { ChartPane } from "./ConditionStage";
import { Segmented } from "./ui";

// What the sensors say now, one place at a time. The strip's cells choose which
// metric the chart shows; the chart is the same one as on the overview, so it can
// also draw a set of parameters together. The band behind the line is the phase's target from
// the recipe of a batch growing there. Sensors never store a batch: the link is
// the place and the time.

const panel = "rounded-xl border border-[#DCE7E8] bg-white";
const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const REFRESH_MS = 60_000;

const STATE_TEXT: Record<RangeState, { label: Bi; className: string }> = {
  ok: { label: { en: "On reference", id: "Sesuai acuan" }, className: "text-[#4F6B73]" },
  rendah: { label: { en: "Below reference", id: "Di bawah acuan" }, className: "font-medium text-[#8A5A07]" },
  tinggi: { label: { en: "Above reference", id: "Di atas acuan" }, className: "font-medium text-[#8A5A07]" },
};

export default function MonitoringPage() {
  const store = useErpStore();
  const t = useT();
  const lang = useLang();
  const since = (iso: string) => ago(iso, undefined, lang);
  const [place, setPlace] = useState<PlaceCode>("PF01");
  const [chosenMetric, setChosenMetric] = useState<string | null>(null);
  const [chosenBatch, setChosenBatch] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped by the reload button, so the chart asks the sensors again.
  const [round, setRound] = useState(0);

  const summary = store.monitoring;
  const metrics = summary ? metricsAt(summary.assets, place) : [];
  const metric = chosenMetric && metrics.includes(chosenMetric) ? chosenMetric : metrics[0] ?? null;

  // Which batches grow here now, for the band behind the line.
  const here = [...store.batches.values()].filter((b) => (place === "CH1" ? store.traysOfBatch(b.code).length > 0 : store.holesOfBatch(b.code).length > 0));
  const batch = here.find((b) => b.code === chosenBatch) ?? here[0] ?? null;

  const targets = useLoad(async () => (batch?.recipeId ? fetchRecipeTargets(batch.recipeId) : []), [batch?.recipeId]);
  const targetOf = (key: string) => targets.data?.find((x) => x.phase === batch?.phaseKey && x.metric === key) ?? null;

  // The chart reloads its own series; the readings above it come with the summary.
  useEffect(() => {
    const timer = window.setInterval(() => void store.loadMonitoring(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [store]);

  const refresh = async () => {
    setRefreshing(true);
    await store.loadMonitoring();
    setRound((n) => n + 1);
    setRefreshing(false);
  };

  if (store.mode === "sample" || (store.hasData && !summary && !store.monitoringError)) {
    return (
      <ErpPage eyebrow={t({ en: "Monitoring", id: "Pemantauan" })} title={t({ en: "Conditions", id: "Kondisi" })}>
        <div className={`${panel} p-5`}>
          <p className="text-[15px] font-medium text-[#0F2F36]">{t({ en: "Sensor tables are not installed yet", id: "Tabel sensor belum dipasang" })}</p>
          <p className="mt-1 text-[14px] leading-[1.5] text-[#4F6B73]">{t({ en: "Run", id: "Jalankan" })} <code className="rounded bg-[#EEF3F4] px-1">web/supabase/pf-monitoring.sql</code> {t({ en: "in the Supabase SQL Editor, then reload this page.", id: "di Supabase SQL Editor, lalu muat ulang halaman ini." })}</p>
        </div>
      </ErpPage>
    );
  }

  const placeAssets = summary?.assets.filter((a) => a.location_code === place && a.status !== "pensiun") ?? [];
  const placeAlarms = summary?.alarms.filter((a) => a.location_code === place) ?? [];
  const silent = placeAssets.filter((a) => a.link_state === "terlambat");
  const label = placeLabel(place, lang).toLowerCase();

  const finding = !summary
    ? undefined
    : placeAssets.length === 0
      ? t({ en: `No devices yet at ${label}.`, id: `Belum ada perangkat di ${label}.` })
      : placeAlarms.length > 0
        ? t({
            en: `${placeAlarms.length} open alarms at ${label}: ${metricLabel(placeAlarms[0].metric)} ${formatWithUnit(placeAlarms[0].metric, placeAlarms[0].value)}.`,
            id: `${placeAlarms.length} alarm terbuka di ${label}: ${metricLabel(placeAlarms[0].metric, lang)} ${formatWithUnit(placeAlarms[0].metric, placeAlarms[0].value, lang)}.`,
          })
        : silent.length > 0
          ? t({
              en: `${silent[0].code} stopped sending since ${silent[0].last_seen_at ? since(silent[0].last_seen_at) : "a while ago"}.`,
              id: `${silent[0].code} berhenti mengirim sejak ${silent[0].last_seen_at ? since(silent[0].last_seen_at) : "beberapa waktu lalu"}.`,
            })
          : t({ en: `No open alarms at ${label}.`, id: `Tidak ada alarm terbuka di ${label}.` });

  const band = metric ? targetOf(metric) : null;
  const rows = summary ? conditionsAt(place, summary.assets, summary.latest, targetOf, lang).rows : [];
  const row = rows.find((r) => r.metric === metric) ?? null;

  return (
    <ErpPage
      eyebrow={t({ en: "Monitoring", id: "Pemantauan" })}
      title={t({ en: "Conditions", id: "Kondisi" })}
      sub={finding}
      actions={
        <button type="button" disabled={refreshing} onClick={() => void refresh()} aria-label={t({ en: "Reload readings", id: "Muat ulang pembacaan" })} className="grid h-11 w-11 place-items-center rounded-lg text-[#36525A] hover:bg-white disabled:opacity-50 sm:h-8 sm:w-8">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="space-y-4">
        {store.monitoringError && <ErrorNote message={store.monitoringError} onRetry={() => store.loadMonitoring()} />}
        <Segmented value={place} options={MONITORED_PLACES.map((p) => ({ key: p.code, label: placeLabel(p.code, lang) }))} onChange={setPlace} />

        {summary && metrics.length === 0 ? (
          <div className={`${panel} px-4 py-8 text-center text-[14px] text-[#4F6B73]`}>
            {t({ en: `No device is sending from ${label}.`, id: `Belum ada perangkat yang mengirim dari ${label}.` })} <Link to="/erp/devices" className="font-medium text-[#0B6477] hover:underline">{t({ en: "Register device", id: "Daftarkan perangkat" })}</Link>
          </div>
        ) : summary ? (
          <>
            {/* One container split by hairlines: each cell is a reading and the chart's choice. */}
            <div
              className={`${panel} grid grid-cols-2 overflow-hidden md:[grid-template-columns:repeat(var(--columns),minmax(0,1fr))]`}
              style={{ "--columns": stripColumns(metrics.length).columns } as React.CSSProperties}
              role="group"
              aria-label={t({ en: "Choose a reading", id: "Pilih pembacaan" })}
            >
              {metrics.map((key, i) => {
                const info = metricInfo(key);
                const reading = latestAt(summary.latest, place, key);
                // An old value is not read against the band: it says how old it is instead.
                const stale = !!reading && isStale(reading, summary.assets);
                const state = reading && !stale ? rangeState(reading.value, targetOf(key)) : null;
                const on = key === metric;
                const last = i === metrics.length - 1;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChosenMetric(key)}
                    style={last ? ({ "--last": stripColumns(metrics.length).lastSpan } as React.CSSProperties) : undefined}
                    className={`min-h-[44px] border-b border-r border-[#EDF2F2] px-4 py-2.5 text-left hover:bg-[#F6F8F8] ${last && metrics.length % 2 ? "col-span-2" : ""} ${last ? "md:[grid-column:span_var(--last)/span_var(--last)]" : ""} ${on ? "bg-[#F1F8F8] shadow-[inset_0_-2px_0_#14919B]" : ""}`}
                  >
                    <span className="block text-[13px] font-medium text-[#4F6B73]">{metricLabel(key, lang)}</span>
                    <span className="block text-[#0F2F36]">
                      <span className="text-[24px] font-semibold leading-tight tabular-nums tracking-[-0.02em]">{reading ? formatValue(key, reading.value, lang) : "-"}</span>
                      {info.unit && <span className="ml-1 text-[13px] text-[#4F6B73]">{info.unit}</span>}
                    </span>
                    <span className={`block text-[12.5px] ${stale ? "font-medium text-[#8A5A07]" : state ? STATE_TEXT[state].className : "text-[#4F6B73]"}`}>
                      {stale ? t({ en: `Last ${since(reading.ts)}`, id: `Terakhir ${since(reading.ts)}` }) : state ? t(STATE_TEXT[state].label) : reading ? since(reading.ts) : t({ en: "No readings yet", id: "Belum ada pembacaan" })}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className={`${panel} min-w-0 p-4`} aria-labelledby="chart-title">
                <h2 id="chart-title" className={`${sectionTitle} mb-2`}>{t({ en: "Chart", id: "Grafik" })}</h2>
                {here.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#4F6B73]">
                    <label className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                      {t({ en: "Reference from", id: "Acuan dari" })}
                      <select value={batch?.code ?? ""} onChange={(e) => setChosenBatch(e.target.value)} className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-[#C9D8DA] bg-white px-2 text-[16px] text-[#0F2F36] sm:min-h-[28px] sm:flex-none sm:text-[13px]">
                        {here.map((b) => <option key={b.code} value={b.code}>{b.code} · {b.crop}</option>)}
                      </select>
                    </label>
                    <span>{band ? formatBand(band.metric, band, lang) : t({ en: "This batch's recipe has no reference for this reading yet.", id: "Resep batch ini belum punya acuan untuk pembacaan ini." })}</span>
                  </div>
                )}
                {row && (
                  <div className="-mx-4 -mb-2 flex h-[420px] flex-col sm:h-[460px]">
                    <ChartPane key={`${place}:${round}`} store={store} place={place} row={row} rows={rows} sample={false} />
                  </div>
                )}
              </section>

              <div className="min-w-0 space-y-4">
                <section className={panel} aria-labelledby="open-alarms">
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <h2 id="open-alarms" className={sectionTitle}>{t({ en: "Open alarms", id: "Alarm terbuka" })} <span className="tabular-nums text-[#4F6B73]">{placeAlarms.length}</span></h2>
                    <Link to="/erp/alarms" className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-[#0B6477] hover:underline sm:min-h-0">{t({ en: "Manage", id: "Kelola" })}</Link>
                  </div>
                  {placeAlarms.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: "No open alarms.", id: "Tidak ada alarm terbuka." })}</p>
                  ) : (
                    <ul>
                      {placeAlarms.slice(0, 4).map((a) => (
                        <li key={a.id} className="border-t border-[#EDF2F2] px-4 py-2.5 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{metricLabel(a.metric, lang)} {formatWithUnit(a.metric, a.value, lang)}</span>
                          <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[12.5px] font-medium ${a.level === "kritis" ? "bg-[#FDECEA] text-[#B3362C]" : "bg-[#FFF6E5] text-[#8A5A07]"}`}>{a.level === "kritis" ? t({ en: "Critical", id: "Kritis" }) : t({ en: "Warning", id: "Peringatan" })}</span>
                          <span className="block text-[13px] text-[#4F6B73]">{a.asset_code} · {since(a.opened_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className={panel} aria-labelledby="place-devices">
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <h2 id="place-devices" className={sectionTitle}>{t({ en: "Devices", id: "Perangkat" })}</h2>
                    <Link to="/erp/devices" className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-[#0B6477] hover:underline sm:min-h-0">{t({ en: "Manage", id: "Kelola" })}</Link>
                  </div>
                  <ul>
                    {placeAssets.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2.5 text-[14px]">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#0F2F36]">{a.code}</span>
                          <span className="block truncate text-[13px] text-[#4F6B73]">{a.last_seen_at ? t({ en: `Last ${since(a.last_seen_at)}`, id: `Terakhir ${since(a.last_seen_at)}` }) : t({ en: "Has never sent", id: "Belum pernah mengirim" })}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-[#36525A]"><span className={`h-2 w-2 rounded-full ${LINK_STATES[a.link_state].dot}`} />{linkStateLabel(a.link_state, lang)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </>
        ) : (
          <DataState state={{ data: null, error: null, loading: true, reload: async () => {} }}>{() => null}</DataState>
        )}
      </div>
    </ErpPage>
  );
}
