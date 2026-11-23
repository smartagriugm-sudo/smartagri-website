import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  ROOT_KEYS,
  dashboardScreen,
  metricsFor,
} from "../lib/indoor-dashboard";
import { headLang, useLang, useT } from "../lib/i18n";
import { Panel } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";

export const Route = createFileRoute("/indoor-farming_/dashboard/calibration")({
  component: CalibrationScreen,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Kalibrasi · Dashboard | smartagri" : "Calibration · Dashboard | smartagri" }] }),
});


// Calibration intervals per parameter, in days. Wet chemistry drifts fastest,
// which is why pH and EC head the list; a solid state CO2 or PAR sensor holds
// its calibration for a season.
const INTERVAL_DAYS: Partial<Record<string, number>> = {
  ph: 14,
  ec: 30,
  dissolvedOxygen: 30,
  co2: 180,
  ppfd: 365,
  airTemp: 180,
  rh: 180,
  waterTemp: 180,
  leafTemp: 180,
};

// Days since each parameter was last checked. Fixed values rather than dates
// computed at render time: the demo must produce identical markup on the server
// and in the browser, and a clock read during render would break that.
const DAYS_SINCE: Partial<Record<string, number>> = {
  ph: 9,
  ec: 21,
  dissolvedOxygen: 27,
  co2: 63,
  ppfd: 120,
  airTemp: 45,
  rh: 45,
  waterTemp: 88,
  leafTemp: 150,
};

// How each kind of instrument is calibrated.
const METHODS = [
  {
    title: { en: "pH and conductivity", id: "pH dan konduktivitas" },
    body: {
      en: "Two point calibration against fresh buffer, pH 4.01 and 7.00, and a 1413 µS/cm conductivity standard. Probes are cleaned and inspected at the same visit.",
      id: "Kalibrasi dua titik dengan buffer segar, pH 4,01 dan 7,00, serta standar konduktivitas 1413 µS/cm. Probe dibersihkan dan diperiksa pada kunjungan yang sama.",
    },
  },
  {
    title: { en: "Dissolved oxygen", id: "Oksigen terlarut" },
    body: {
      en: "Single point in water saturated air, corrected for temperature and local barometric pressure. Membrane and electrolyte replaced when response time lengthens.",
      id: "Satu titik di udara jenuh air, dikoreksi terhadap suhu dan tekanan barometrik setempat. Membran dan elektrolit diganti saat waktu respons memanjang.",
    },
  },
  {
    title: { en: "Light and CO2", id: "Cahaya dan CO2" },
    body: {
      en: "PAR sensors checked against a reference quantum sensor under the same fixture. CO2 verified with a certified span gas, with a fresh air zero as a cross check.",
      id: "Sensor PAR dicek terhadap sensor kuantum referensi di bawah lampu yang sama. CO2 diverifikasi dengan span gas bersertifikat, ditambah nol udara segar sebagai pembanding.",
    },
  },
];

function CalibrationScreen() {
  const lang = useLang();
  const t = useT();
  const NAV = dashboardScreen("/indoor-farming/dashboard/calibration", lang);
  const METRICS = metricsFor(lang);
  const rows = [...AERIAL_KEYS, ...ROOT_KEYS]
    .filter((k) => INTERVAL_DAYS[k] != null)
    .map((k) => {
      const interval = INTERVAL_DAYS[k]!;
      const since = DAYS_SINCE[k] ?? 0;
      const due = interval - since;
      return { key: k, interval, since, due };
    })
    .sort((a, b) => a.due - b.due);

  return (
    <>
      <ScreenHeading title={NAV.label} blurb={NAV.blurb} />

      <Panel
        title={t({ en: "Calibration schedule", id: "Jadwal kalibrasi" })}
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            {t({ en: "Sorted by what falls due first", id: "Diurutkan dari yang paling dulu jatuh tempo" })}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] text-neutral-400">
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Parameter", id: "Parameter" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Instrument", id: "Instrumen" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Interval", id: "Interval" })}</th>
                <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Last checked", id: "Terakhir dicek" })}</th>
                <th className="pb-2 font-medium" style={body}>{t({ en: "Status", id: "Status" })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const metric = METRICS[r.key];
                const overdue = r.due <= 0;
                const soon = r.due > 0 && r.due <= 7;
                const tone = overdue ? "#C4342F" : soon ? "#C58A00" : "#0E9F6E";
                return (
                  <tr key={r.key} className="border-t border-[#0B6477]/8">
                    <td className="py-2.5 pr-3" style={body}>
                      <span className="flex items-center gap-2">
                        <metric.icon className="w-3.5 h-3.5 shrink-0" style={{ color: metric.tone }} />
                        <span className="text-[13px] font-medium text-neutral-800">
                          {metric.label}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[12px] text-neutral-500" style={body}>
                      {metric.sensor}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {t({ en: `${r.interval} days`, id: `${r.interval} hari` })}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-neutral-600 tabular-nums" style={body}>
                      {t({ en: `${r.since} days ago`, id: `${r.since} hari lalu` })}
                    </td>
                    <td className="py-2.5" style={body}>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ color: tone, backgroundColor: `${tone}1A` }}
                      >
                        {overdue
                          ? t({ en: `${Math.abs(r.due)} days overdue`, id: `Terlambat ${Math.abs(r.due)} hari` })
                          : t({ en: `Due in ${r.due} days`, id: `Jatuh tempo ${r.due} hari lagi` })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={t({ en: "How we calibrate", id: "Cara kami mengalibrasi" })}>
        <div className="grid gap-4 sm:grid-cols-3">
          {METHODS.map((c) => (
            <div key={c.title.en} className="rounded-xl border border-[#0B6477]/8 bg-[#FAFCFB] p-4">
              <h3 className="text-[13px] font-medium text-neutral-900" style={display}>
                {t(c.title)}
              </h3>
              <p className="mt-1.5 text-[12px] text-neutral-500 leading-relaxed" style={body}>
                {t(c.body)}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
