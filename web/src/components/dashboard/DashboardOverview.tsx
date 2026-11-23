import {
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { indoorDashboardImage } from "../../lib/assets";
import { accent, body, display } from "../../lib/fonts";
import {
  CHART_KEYS,
  STATUS_TONE,
  ACTUATOR_TONE,
  STEP_MINUTES,
  actuatorLabel,
  axisPercent,
  clockLabel,
  fixed,
  formatValue,
  metricsFor,
  readingAt,
  statusOf,
  targetFor,
  rangeAxis,
  rangesFor,
  weatherLabel,
  zonesFor,
  type MetricKey,
} from "../../lib/indoor-dashboard";
import { useDashboard } from "../../lib/dashboard-state";
import { localeOf, useLang, useT } from "../../lib/i18n";
import { DayChart, KpiCard, MetricBar, Panel, Pill, StatusDot, num } from "./parts";

// The Overview screen: the facility at a glance. Everything it draws comes from
// the shared dashboard context, so the playhead and the selected zone stay in
// step with whatever other screen the operator came from.
export default function DashboardOverview() {
  const {
    tick,
    zone,
    zoneId,
    setZoneId,
    metricKey,
    setMetricKey,
    range,
    setRange,
    reading,
    chartSeries,
    weather,
    WeatherIcon,
    rain,
    actuators,
    resources,
    alerts,
    onlineZones,
    totalArea,
    zoneStatus,
    inBand,
  } = useDashboard();

  // Weekly and monthly series are entirely in the past, so the playhead sits on
  // the last point. Only the daily view has a "rest of the day" still to come.
  const lang = useLang();
  const t = useT();
  const METRICS = metricsFor(lang);
  const ZONES = zonesFor(lang);
  const axis = rangeAxis(range, lang);
  const playhead = range === "daily" ? tick : chartSeries.length - 1;

  return (
    <>
  {/* Hero strip. Structured after the reference: the photo carries the
      band, the headline sits on it, and the summary and weather cards
      float over the image rather than beside it. */}
  <div className="relative overflow-hidden rounded-2xl bg-[#08313A] min-h-[210px]">
    <img
      src={indoorDashboardImage("facility-hero.webp")}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
    {/* Two overlays: a left-to-right wash so the headline stays legible
        over any photo, and a bottom lift so the glass cards separate
        from a bright canopy underneath them. */}
    <div className="absolute inset-0 bg-gradient-to-r from-[#08313A]/95 via-[#08313A]/70 to-[#08313A]/25" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#08313A]/80 via-transparent to-transparent" />

    <div className="relative flex min-h-[210px] flex-col justify-between gap-4 p-4 sm:p-5">
      <div className="max-w-[560px]">
        <div className="text-[11px] font-medium text-[#45DFB1]" style={body}>
          Smart Agriculture Research Center · Yogyakarta
        </div>
        <h2
          className="mt-1 text-[19px] sm:text-[23px] font-semibold tracking-[-0.03em] leading-[1.15] text-white"
          style={display}
        >
          {t({ en: `${inBand} of ${onlineZones.length} rooms are`, id: `${inBand} dari ${onlineZones.length} ruang` })}{" "}
          <span style={{ ...accent, color: "#80ED99" }}>
            {t({ en: "inside their target envelope", id: "berada dalam rentang targetnya" })}
          </span>
        </h2>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* facility summary */}
        <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-4 sm:gap-5">
            <div>
              <div className="text-[11px] text-white/60" style={body}>
                {t({ en: "Rooms online", id: "Ruang online" })}
              </div>
              <div
                className="text-[21px] font-semibold tracking-[-0.03em] text-white tabular-nums leading-tight"
                style={display}
              >
                {onlineZones.length}
                <span className="text-[13px] font-normal text-white/50">
                  {" "}
                  / {ZONES.length}
                </span>
              </div>
              <div className="text-[10px] text-white/50" style={body}>
                {t({ en: "1 in maintenance", id: "1 dalam pemeliharaan" })}
              </div>
            </div>
            <div className="h-10 w-px bg-white/15" />
            <div>
              <div className="text-[11px] text-white/60" style={body}>
                {t({ en: "Under control", id: "Terkendali" })}
              </div>
              <div
                className="text-[21px] font-semibold tracking-[-0.03em] text-white tabular-nums leading-tight"
                style={display}
              >
                {totalArea.toLocaleString(localeOf(lang))}
                <span className="text-[13px] font-normal text-white/50"> m²</span>
              </div>
              <div className="text-[10px] text-white/50" style={body}>
                {t({ en: `across ${onlineZones.length} rooms`, id: `di ${onlineZones.length} ruang` })}
              </div>
            </div>
            <div className="hidden sm:block h-10 w-px bg-white/15" />
            <div className="hidden sm:block">
              <div className="text-[11px] text-white/60" style={body}>
                {t({ en: "Facility clock", id: "Jam fasilitas" })}
              </div>
              <div
                className="text-[21px] font-semibold tracking-[-0.03em] text-white tabular-nums leading-tight"
                style={display}
              >
                {clockLabel(tick)}
              </div>
              <div className="text-[10px] text-white/50" style={body}>
                {t({ en: `sampling every ${STEP_MINUTES} min`, id: `sampel tiap ${STEP_MINUTES} menit` })}
              </div>
            </div>
          </div>
        </div>

        {/* weather station */}
        <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-3 min-w-[210px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-white/60" style={body}>
                {t({ en: "Weather station · outdoor", id: "Stasiun cuaca · luar" })}
              </div>
              <div
                className="text-[19px] font-semibold text-white tabular-nums leading-tight"
                style={display}
              >
                {fixed(weather.airTemp, 1, lang)} °C
              </div>
              <div className="text-[11px] text-white/60" style={body}>
                {weatherLabel(weather.condition, lang)}
              </div>
            </div>
            <WeatherIcon className="w-8 h-8 text-[#45DFB1]" strokeWidth={1.5} />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
            {[
              { label: t({ en: "Solar", id: "Radiasi" }), value: `${Math.round(weather.solar)} W/m²` },
              { label: t({ en: "Humidity", id: "Kelembapan" }), value: `${Math.round(weather.rh)} %` },
              { label: t({ en: "Wind", id: "Angin" }), value: `${fixed(weather.wind, 1, lang)} m/s` },
              { label: t({ en: "Rain today", id: "Hujan hari ini" }), value: `${fixed(rain, 1, lang)} mm` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/50" style={body}>
                  {row.label}
                </span>
                <span
                  className="text-[11px] font-medium text-white tabular-nums"
                  style={body}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* room switcher */}
  <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <span className="text-[12px] font-medium text-neutral-400 shrink-0" style={body}>
      {t({ en: "Room", id: "Ruang" })}
    </span>
    {ZONES.map((z) => (
      <Pill key={z.id} active={z.id === zoneId} onClick={() => setZoneId(z.id)}>
        <span className="inline-flex items-center gap-1.5">
          <CircleDot
            className="w-3 h-3"
            style={{ color: z.online ? "#0E9F6E" : "#C4342F" }}
          />
          {z.short}
        </span>
      </Pill>
    ))}
  </div>

  {/* KPI row */}
  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
    {(["airTemp", "rh", "vpd", "co2"] as MetricKey[]).map((key) => (
      <div
        key={key}
        className="min-w-0 rounded-2xl border border-[#0B6477]/10 bg-white shadow-[0_1px_2px_rgba(8,49,58,0.04)]"
      >
        <KpiCard zone={zone} metricKey={key} tick={tick} />
      </div>
    ))}
  </div>

  {/* chart + root zone */}
  <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3">
    <Panel
      className="flex flex-col"
      title={`${METRICS[metricKey].label} · ${zone.short}`}
      action={
        <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHART_KEYS.map((key) => (
            <Pill
              key={key}
              active={key === metricKey}
              onClick={() => setMetricKey(key)}
              tone={METRICS[key].tone}
            >
              {METRICS[key].short}
            </Pill>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
        <span
          className="text-[30px] font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums leading-none"
          style={display}
        >
          {formatValue(metricKey, chartSeries[playhead], lang)}
        </span>
        <span className="text-[13px] text-neutral-400" style={body}>
          {METRICS[metricKey].unit}
        </span>
        <StatusDot status={statusOf(metricKey, chartSeries[playhead], zone)} />
        <span className="text-[12px] text-neutral-400" style={body}>
          {t({ en: "Target band", id: "Rentang target" })} {num(targetFor(metricKey, zone)[0], lang)}{" "}
          {t({ en: "to", id: "sampai" })} {num(targetFor(metricKey, zone)[1], lang)}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {rangesFor(lang).map((r) => (
            <Pill key={r.key} active={r.key === range} onClick={() => setRange(r.key)}>
              {r.label}
            </Pill>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-[250px]">
        <DayChart
          series={chartSeries}
          metricKey={metricKey}
          tick={playhead}
          zone={zone}
          ticks={axis.ticks}
          labelAt={axis.labelAt}
        />
      </div>
      <p className="mt-1 text-[11px] text-neutral-400" style={body}>
        {lang === "id"
          ? range === "daily"
            ? "Garis tegas adalah data terukur sampai playhead. Garis putus-putus adalah sisa hari yang dimodelkan."
            : `Satu titik per hari, masing-masing rata-rata harian. ${
                range === "weekly" ? "7 hari terakhir" : "30 hari terakhir"
              }, berakhir hari ini.`
          : range === "daily"
            ? "Solid line is measured to the playhead. The dashed continuation is the modelled rest of the day."
            : `One point per day, each the day's average. ${
                range === "weekly" ? "Last 7 days" : "Last 30 days"
              }, ending today.`}
      </p>
    </Panel>

    <div className="flex min-w-0 flex-col gap-3">
      <Panel
        title={t({ en: "Root zone", id: "Zona akar" })}
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            {t({ en: "Mixing tank · 2,000 L", id: "Tangki pencampur · 2.000 L" })}
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
          {(["ph", "ec", "dissolvedOxygen", "waterTemp"] as MetricKey[]).map((key) => (
            <MetricBar key={key} metricKey={key} value={reading[key]} zone={zone} />
          ))}
        </div>
      </Panel>

      <Panel title={t({ en: "Light and canopy", id: "Cahaya dan kanopi" })}>
        <div className="flex flex-col gap-3">
          {(["ppfd", "dli", "leafTemp"] as MetricKey[]).map((key) => {
            const m = METRICS[key];
            const value = reading[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600"
                    style={body}
                  >
                    <m.icon className="w-3.5 h-3.5" style={{ color: m.tone }} />
                    {m.label}
                  </span>
                  <span
                    className="text-[13px] font-semibold text-neutral-900 tabular-nums"
                    style={display}
                  >
                    {formatValue(key, value, lang)}
                    <span className="ml-1 text-[10px] font-normal text-neutral-400">
                      {m.unit}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F3F7F6] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${axisPercent(key, value)}%`,
                      backgroundColor: m.tone,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  </div>

  {/* room comparison + actuators */}
  <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3">
    <Panel
      title={t({ en: "Room comparison", id: "Perbandingan ruang" })}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {t({ en: `${inBand} of ${onlineZones.length} rooms active`, id: `${inBand} dari ${onlineZones.length} ruang aktif` })}
        </span>
      }
      padded={false}
    >
      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="text-[11px] text-neutral-400">
              <th className="pb-2 pr-3 font-medium" style={body}>
                {t({ en: "Room", id: "Ruang" })}
              </th>
              <th className="pb-2 pr-3 font-medium" style={body}>
                {t({ en: "Crop", id: "Tanaman" })}
              </th>
              <th className="pb-2 pr-3 font-medium" style={body}>
                {t({ en: "Air", id: "Udara" })}
              </th>
              <th className="pb-2 pr-3 font-medium" style={body}>
                VPD
              </th>
              <th className="pb-2 pr-3 font-medium" style={body}>
                EC
              </th>
              <th className="pb-2 font-medium" style={body}>
                {t({ en: "Status", id: "Status" })}
              </th>
            </tr>
          </thead>
          <tbody>
            {ZONES.map((z) => {
              const r = readingAt(z, tick);
              const status = zoneStatus(z);
              return (
                <tr
                  key={z.id}
                  className={`border-t border-[#0B6477]/8 text-[13px] ${
                    z.id === zoneId ? "bg-[#F3F7F6]" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3" style={body}>
                    <button
                      type="button"
                      onClick={() => setZoneId(z.id)}
                      className="font-medium text-neutral-800 hover:text-[#0B6477] hover:underline text-left"
                    >
                      {z.short}
                    </button>
                  </td>
                  <td className="py-2.5 pr-3 text-neutral-500" style={body}>
                    {z.crop}
                  </td>
                  <td
                    className="py-2.5 pr-3 text-neutral-600 tabular-nums whitespace-nowrap"
                    style={body}
                  >
                    {z.online ? `${fixed(r.airTemp, 1, lang)} °C` : "-"}
                  </td>
                  <td
                    className="py-2.5 pr-3 text-neutral-600 tabular-nums whitespace-nowrap"
                    style={body}
                  >
                    {z.online ? `${fixed(r.vpd, 2, lang)} kPa` : "-"}
                  </td>
                  <td
                    className="py-2.5 pr-3 text-neutral-600 tabular-nums whitespace-nowrap"
                    style={body}
                  >
                    {z.online ? fixed(r.ec, 2, lang) : "-"}
                  </td>
                  <td className="py-2.5">
                    {z.online ? (
                      <StatusDot status={status} />
                    ) : (
                      <span
                        className="text-[11px] font-medium text-neutral-400"
                        style={body}
                      >
                        Offline
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel
      title={t({ en: "Actuators", id: "Aktuator" })}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {t({
            en: `${actuators.filter((a) => a.state === "on").length} of ${actuators.length} running`,
            id: `${actuators.filter((a) => a.state === "on").length} dari ${actuators.length} berjalan`,
          })}
        </span>
      }
    >
      <div className="flex flex-col gap-2.5">
        {actuators.map((a) => {
          const tone = ACTUATOR_TONE[a.state];
          return (
            <div key={a.name} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: tone.bg }}
              >
                <a.icon className="w-4 h-4" style={{ color: tone.color }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-neutral-800 truncate" style={body}>
                  {a.name}
                </div>
                <div className="text-[11px] text-neutral-400 truncate" style={body}>
                  {a.room}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.02em]"
                  style={{ ...body, color: tone.color, backgroundColor: tone.bg }}
                >
                  {actuatorLabel(a.state, lang)}
                </span>
                {/* How hard it is working is a separate question from whether it
                    is working, so the load only appears when there is a load. */}
                {a.state === "on" && (
                  <span className="text-[10px] text-neutral-400 tabular-nums" style={body}>
                    {t({ en: `${a.load}% load`, id: `beban ${a.load}%` })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  </div>

  {/* resource use + event log */}
  <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3">
    <Panel
      className="flex flex-col"
      title={t({ en: "Resource use today", id: "Pemakaian sumber daya hari ini" })}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {t({ en: "Since midnight", id: "Sejak tengah malam" })}
        </span>
      }
    >
      {/* What the facility has consumed so far. This replaced a schematic of
          the water loop, which looked like a diagram but only ever showed two
          live numbers. Consumption is the thing an operator has to act on and
          nothing else on this screen reports it. */}
      <div className="flex flex-1 flex-col justify-center gap-4">
        {resources.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <r.icon className="w-4 h-4 shrink-0 text-[#14919B]" />
                <span className="truncate text-[13px] text-neutral-700" style={body}>
                  {r.label}
                </span>
                <span className="hidden sm:inline truncate text-[11px] text-neutral-400" style={body}>
                  {r.detail}
                </span>
              </span>
              <span
                className="shrink-0 text-[15px] font-semibold text-neutral-900 tabular-nums"
                style={display}
              >
                {r.value}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3F7F6]">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.round(r.share * 100)}%`,
                  backgroundColor: r.share > 0.85 ? "#B26205" : "#14919B",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-neutral-400" style={body}>
        {t({
          en: "Meters read against the day's planned budget. Nutrient stock counts down from a full tank rather than up.",
          id: "Meter dibandingkan dengan anggaran harian yang direncanakan. Stok nutrisi dihitung mundur dari tangki penuh, bukan naik.",
        })}
      </p>
    </Panel>

    <Panel
      title={t({ en: "Event log", id: "Log kejadian" })}
      action={
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B6477]"
          style={body}
        >
          {t({ en: "View all", id: "Lihat semua" })}
          <ArrowRight className="w-3 h-3" />
        </span>
      }
    >
      <ul className="flex flex-col gap-3">
        {alerts.map((a, i) => (
          <li key={`${a.zone}-${i}`} className="flex gap-2.5">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_TONE[a.level].color }}
            />
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-neutral-800" style={body}>
                {a.zone}
              </div>
              <p className="text-[12px] text-neutral-500 leading-snug" style={body}>
                {a.message}
              </p>
              <div className="text-[10px] text-neutral-400 mt-0.5" style={body}>
                {a.ago}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  </div>
    </>
  );
}
