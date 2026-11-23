import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import {
  STATUS_TONE,
  dashboardScreen,
  fixed,
  formatValue,
  metricsFor,
  rangesFor,
  statusOf,
  targetFor,
  weatherLabel,
} from "../lib/indoor-dashboard";
import { headLang, useLang, useT } from "../lib/i18n";
import { useDashboard } from "../lib/dashboard-state";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { DayChart } from "../components/dashboard/parts";
import { CHART_KEYS, AERIAL_KEYS, rangeAxis } from "../lib/indoor-dashboard";
import { Pill, num } from "../components/dashboard/parts";

export const Route = createFileRoute("/indoor-farming_/dashboard/climate")({
  component: ClimateScreen,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Iklim · Dashboard | smartagri" : "Climate · Dashboard | smartagri" }] }),
});


// Aerial environment, one zone at a time, against the outdoor weather that is
// driving it. The pairing is the point: a rising VPD at midday reads very
// differently when the solar figure beside it explains why.
function ClimateScreen() {
  const { zone, tick, metricKey, setMetricKey, chartSeries, reading, weather, WeatherIcon, rain, range, setRange } =
    useDashboard();
  const lang = useLang();
  const t = useT();
  const NAV = dashboardScreen("/indoor-farming/dashboard/climate", lang);
  const METRICS = metricsFor(lang);
  const axis = rangeAxis(range, lang);
  const playhead = range === "daily" ? tick : chartSeries.length - 1;

  return (
    <>
      <ScreenHeading title={NAV.label} blurb={NAV.blurb} />

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title={`${METRICS[metricKey].label} · ${zone.short}`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {CHART_KEYS.filter((k) => AERIAL_KEYS.includes(k)).map((k) => (
                <Pill
                  key={k}
                  active={k === metricKey}
                  onClick={() => setMetricKey(k)}
                  tone={METRICS[k].tone}
                >
                  {METRICS[k].short}
                </Pill>
              ))}
            </div>
          }
        >
          {zone.online ? (
            <>
              <div className="mb-2 flex items-center gap-1">
                {rangesFor(lang).map((r) => (
                  <Pill key={r.key} active={r.key === range} onClick={() => setRange(r.key)}>
                    {r.label}
                  </Pill>
                ))}
              </div>
              <DayChart
                series={chartSeries}
                metricKey={metricKey}
                tick={playhead}
                zone={zone}
                ticks={axis.ticks}
                labelAt={axis.labelAt}
              />
            </>
          ) : (
            <p className="py-10 text-center text-[13px] text-neutral-400" style={body}>
              {t({
                en: `${zone.name} is offline. Pick another room to see its climate.`,
                id: `${zone.name} sedang offline. Pilih ruang lain untuk melihat iklimnya.`,
              })}
            </p>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title={t({ en: "Outdoor weather", id: "Cuaca luar" })}>
            <div className="flex items-center gap-4">
              <WeatherIcon className="w-10 h-10 shrink-0 text-[#14919B]" strokeWidth={1.5} />
              <div>
                <div
                  className="text-[26px] font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums leading-none"
                  style={display}
                >
                  {fixed(weather.airTemp, 1, lang)} °C
                </div>
                <div className="mt-1 text-[12px] text-neutral-500" style={body}>
                  {weatherLabel(weather.condition, lang)}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: t({ en: "Solar", id: "Radiasi" }), value: `${Math.round(weather.solar)} W/m²` },
                { label: t({ en: "Humidity", id: "Kelembapan" }), value: `${Math.round(weather.rh)} %` },
                { label: t({ en: "Wind", id: "Angin" }), value: `${fixed(weather.wind, 1, lang)} m/s` },
                { label: t({ en: "Rain today", id: "Hujan hari ini" }), value: `${fixed(rain, 1, lang)} mm` },
              ].map((r) => (
                <div key={r.label} className="rounded-xl bg-[#F3F7F6] px-3 py-2.5">
                  <div className="text-[10px] text-neutral-400" style={body}>
                    {r.label}
                  </div>
                  <div
                    className="text-[14px] font-semibold text-neutral-900 tabular-nums"
                    style={display}
                  >
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={`${t({ en: "Aerial readings", id: "Bacaan udara" })} · ${zone.short}`}>
            {zone.online ? (
              <div className="flex flex-col gap-2">
                {AERIAL_KEYS.map((k) => {
                  const status = statusOf(k, reading[k], zone);
                  const [lo, hi] = targetFor(k, zone);
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 text-[12px] text-neutral-600 truncate" style={body}>
                        {METRICS[k].label}
                      </span>
                      <span className="text-[10px] text-neutral-400 shrink-0" style={body}>
                        {num(lo, lang)} {t({ en: "to", id: "sampai" })} {num(hi, lang)}
                      </span>
                      <span
                        className="w-20 text-right text-[13px] font-semibold tabular-nums shrink-0"
                        style={{ ...display, color: STATUS_TONE[status].color }}
                      >
                        {formatValue(k, reading[k], lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-[13px] text-neutral-400" style={body}>
                {t({ en: "Room offline.", id: "Ruang offline." })}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
