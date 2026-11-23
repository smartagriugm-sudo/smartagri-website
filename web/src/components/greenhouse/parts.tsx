import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CircleDot, Loader2, RefreshCw } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { Panel, Pill } from "../dashboard/parts";
import TrendChart from "../erp/TrendChart";
import { mergeSeries } from "../../lib/pf/conditions";
import { niceTicks } from "../../lib/pf/monitoring";
import {
  KIND_LABEL,
  MODE_LABEL,
  RANGES,
  ago,
  deviceFresh,
  formatMetric,
  metricMeta,
  seriesStats,
  siteOnline,
  stepMinutesFor,
  type EdgeActuator,
  type EdgeDevice,
  type EdgePoint,
  type RangeKey,
} from "../../lib/edge/field";
import { useFieldData } from "./FieldData";
import { FIELD_BASE } from "./nav";
import { localeOf, useLang, useT, type Lang } from "../../lib/i18n";

export const GOOD = "#0E9F6E";
export const BAD = "#C4342F";
export const WARN = "#B7791F";
export const QUIET = "#8A9A9E";

const TRENDS = `${FIELD_BASE}/trends` as const;

/* ----------------------------------------------------------- language */

// lib/edge/field.ts writes its labels in English. The Indonesian copy lives here,
// keyed by the same metric, kind, mode, range, and route keys, so the data layer
// stays untouched.

const METRIC_LABEL_ID: Record<string, string> = {
  temperature: "Suhu udara",
  humidity: "Kelembapan relatif",
  co2: "CO₂",
  vpd: "VPD",
  battery: "Baterai",
  water_temp: "Suhu larutan",
  ph: "pH",
  ec: "EC",
  do: "Oksigen terlarut",
  pressure: "Tekanan udara",
  wind_speed: "Kecepatan angin",
  wind_dir: "Arah angin",
};

/** A measured value's name in the reader's language. */
export function metricLabel(metric: string, lang: Lang): string {
  return (lang === "id" ? METRIC_LABEL_ID[metric] : undefined) ?? metricMeta(metric).label;
}

/** `formatMetric` with an Indonesian decimal comma when the language is `id`. */
export function fmtMetric(metric: string, value: number | null | undefined, lang: Lang, withUnit = true): string {
  const out = formatMetric(metric, value, withUnit);
  return lang === "id" ? out.replace(".", ",") : out;
}

const KIND_LABEL_ID: Record<string, string> = {
  engrow: "Sensor iklim (Engrow)",
  nutrigrow: "Pengendali nutrisi (Nutrigrow)",
  aws: "Stasiun cuaca (AWS)",
  other: "Perangkat",
};

export function kindLabel(kind: string, lang: Lang): string {
  if (lang === "id") return KIND_LABEL_ID[kind] ?? KIND_LABEL_ID.other;
  return KIND_LABEL[kind] ?? KIND_LABEL.other;
}

const MODE_LABEL_ID: Record<string, string> = { auto: "Otomatis", manual: "Manual", pause: "Jeda" };

export function modeLabel(mode: string, lang: Lang): string {
  return (lang === "id" ? MODE_LABEL_ID[mode] : MODE_LABEL[mode]) ?? mode;
}

/** `ago` in the reader's language. */
export function agoText(iso: string | null, now: number, lang: Lang): string {
  if (lang !== "id") return ago(iso, now);
  if (!iso) return "belum pernah";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

const RANGE_LABEL_ID: Record<RangeKey, string> = { "24h": "24 jam", "7d": "7 hari", "30d": "30 hari" };

export function rangeLabel(key: RangeKey, lang: Lang): string {
  return lang === "id" ? RANGE_LABEL_ID[key] : (RANGES.find((r) => r.key === key)?.label ?? key);
}

const NAV_ID: Record<string, { label: string; blurb: string }> = {
  [FIELD_BASE]: {
    label: "Ringkasan",
    blurb: "Lokasi terpilih saat ini: apakah masih mengirim data, kondisi terbarunya, dan apa pun yang perlu dicek.",
  },
  [`${FIELD_BASE}/sensors`]: {
    label: "Sensor",
    blurb: "Setiap perangkat di lokasi dengan rata-rata 10 menit terbarunya. Pilih satu bacaan untuk melihat perubahannya.",
  },
  [`${FIELD_BASE}/trends`]: {
    label: "Tren",
    blurb: "Nilai terukur apa pun selama sehari, seminggu, atau sebulan terakhir.",
  },
  [`${FIELD_BASE}/actuators`]: {
    label: "Aktuator",
    blurb: "Kipas, pompa, dan relay lain seperti terakhir terbaca oleh edge PC. Hanya baca.",
  },
  [`${FIELD_BASE}/manage`]: {
    label: "Kelola lokasi",
    blurb: "Daftarkan lokasi, beri token untuk tiap edge PC, dan pilih akun yang boleh membaca tiap lokasi.",
  },
};

/** A Greenhouse section's menu label and lede, looked up by its route. */
export function greenhouseNavCopy(item: { to: string; label: string; blurb: string }, lang: Lang): { label: string; blurb: string } {
  return (lang === "id" ? NAV_ID[item.to] : undefined) ?? { label: item.label, blurb: item.blurb };
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "bad" }) {
  return (
    <div
      className="rounded-2xl border px-5 py-4 text-[13px] leading-relaxed"
      style={{
        ...body,
        borderColor: tone === "bad" ? "#C4342F33" : "rgba(11,100,119,0.12)",
        backgroundColor: tone === "bad" ? "#C4342F0A" : "#F3F7F6",
        color: tone === "bad" ? "#8F2420" : "#36545B",
      }}
    >
      {children}
    </div>
  );
}

export function Loading({ text }: { text?: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-neutral-500" style={body}>
      <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" /> {text ?? t({ en: "Loading field data...", id: "Memuat data lapangan..." })}
    </div>
  );
}

/** Link to the Trends section with a device and metric already chosen. */
export function TrendLink({ device, metric, className, children, title }: { device: string; metric: string; className?: string; children: ReactNode; title?: string }) {
  return (
    <Link to={TRENDS} search={{ site: undefined, device, metric }} className={className} title={title}>
      {children}
    </Link>
  );
}

/* ----------------------------------------------------------- site bar */

// The selected site with its edge PC status, shown above every section, and the
// switcher when the account may read more than one site.
export function SiteBar() {
  const { sites, site, selectSite, now, refresh, refreshing, sample } = useFieldData();
  const t = useT();
  const lang = useLang();
  if (!site) return null;
  const online = siteOnline(site, now);
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
              {site.name}
            </h2>
            {sample && (
              <span className="rounded-full bg-[#B7791F]/12 px-2 py-0.5 text-[11px] font-medium text-[#8A5A12]" style={body}>
                {t({ en: "Sample data", id: "Data contoh" })}
              </span>
            )}
          </div>
          <p className="text-[13px] text-neutral-500" style={body}>
            {site.location || site.code}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ ...body, color: online ? GOOD : BAD, backgroundColor: online ? "#0E9F6E14" : "#C4342F14" }}
          >
            <CircleDot className="h-3.5 w-3.5" />
            {online ? t({ en: "Edge PC online", id: "Edge PC online" }) : t({ en: "Edge PC offline", id: "Edge PC offline" })}
          </span>
          <span className="text-[12px] text-neutral-500" style={body}>
            {t({ en: "Last push", id: "Kiriman terakhir" })} {agoText(site.last_seen_at, now, lang)}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0B6477] hover:bg-[#0B6477]/8"
            aria-label={t({ en: "Refresh", id: "Muat ulang" })}
            title={t({ en: "Refresh", id: "Muat ulang" })}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {sites && sites.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#0B6477]/8 pt-3">
          <span className="mr-1 text-[11px] text-neutral-400" style={body}>
            {t({ en: "Site", id: "Lokasi" })}
          </span>
          {sites.map((s) => (
            <Pill key={s.id} active={s.id === site.id} onClick={() => selectSite(s.id)}>
              {s.name}
            </Pill>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- tiles */

export function StatTile({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#0B6477]/10 bg-white p-4 shadow-[0_1px_2px_rgba(8,49,58,0.04)]">
      <div className="text-[12px] text-neutral-500" style={body}>
        {label}
      </div>
      <div className="mt-1 text-[22px] font-semibold tracking-[-0.025em] tabular-nums" style={{ ...display, color: tone ?? "#171717" }}>
        {value}
      </div>
      {note && (
        <div className="mt-0.5 truncate text-[12px] text-neutral-500" style={body}>
          {note}
        </div>
      )}
    </div>
  );
}

/** A metric's latest value; opens it in Trends. */
export function ReadingTile({ device, metric, value, caption, stale }: { device: string; metric: string; value: number | undefined; caption?: string; stale?: boolean }) {
  const meta = metricMeta(metric);
  const lang = useLang();
  const label = metricLabel(metric, lang);
  return (
    <TrendLink
      device={device}
      metric={metric}
      title={lang === "id" ? `${label}: buka tren` : `${label}: open trend`}
      className="group block rounded-xl border border-[#0B6477]/10 bg-[#FAFCFB] px-3 py-2.5 transition-colors hover:border-[#14919B]/50 hover:bg-white"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="truncate text-[11px] text-neutral-500" style={body}>
          {label}
        </span>
        <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-neutral-300 transition-colors group-hover:text-[#14919B]" />
      </div>
      <div className="mt-0.5 text-[17px] font-semibold tabular-nums" style={{ ...display, color: stale ? QUIET : "#171717" }}>
        {fmtMetric(metric, value, lang)}
      </div>
      {caption && (
        <div className="truncate text-[11px] text-neutral-400" style={body}>
          {caption}
        </div>
      )}
    </TrendLink>
  );
}

export function deviceState(d: EdgeDevice, now: number, lang: Lang = "en"): { text: string; color: string } {
  const id = lang === "id";
  if (!d.last_seen_at) return { text: id ? "Belum ada data" : "No data yet", color: QUIET };
  if (deviceFresh(d.last_seen_at, now)) return { text: id ? "Mengirim data" : "Reporting", color: GOOD };
  return { text: `${id ? "Diam" : "Silent"}, ${agoText(d.last_seen_at, now, lang)}`, color: BAD };
}

export function DeviceCard({ device, latest, now }: { device: EdgeDevice; latest: Map<string, { value: number; ts: string }>; now: number }) {
  const lang = useLang();
  const t = useT();
  const state = deviceState(device, now, lang);
  const stale = !deviceFresh(device.last_seen_at, now);
  return (
    <Panel>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-neutral-900" style={display}>
            {device.name || device.source_id}
          </div>
          <div className="truncate text-[12px] text-neutral-500" style={body}>
            {kindLabel(device.kind, lang)}
          </div>
        </div>
        <span
          className="shrink-0 text-[11px] font-medium"
          style={{ ...body, color: state.color }}
          title={device.last_seen_at ? new Date(device.last_seen_at).toLocaleString(lang === "id" ? localeOf(lang) : "en-GB", { timeZone: "Asia/Jakarta" }) : undefined}
        >
          {state.text}
        </span>
      </div>
      {device.metrics.length === 0 ? (
        <p className="text-[12px] text-neutral-500" style={body}>
          {t({ en: "This device reports no measured values.", id: "Perangkat ini tidak mengirim nilai terukur." })}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {device.metrics.map((metric) => (
            <ReadingTile key={metric} device={device.id} metric={metric} value={latest.get(`${device.id}:${metric}`)?.value} stale={stale} />
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- actuators */

export function ActuatorTable({ actuators, now }: { actuators: EdgeActuator[]; now: number }) {
  const t = useT();
  const lang = useLang();
  if (actuators.length === 0) {
    return (
      <p className="text-[13px] text-neutral-500" style={body}>
        {t({ en: "No actuators reported by this site.", id: "Lokasi ini tidak melaporkan aktuator." })}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="text-[11px] text-neutral-400">
            <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Actuator", id: "Aktuator" })}</th>
            <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Zone", id: "Zona" })}</th>
            <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "State", id: "Kondisi" })}</th>
            <th className="pb-2 pr-3 font-medium" style={body}>{t({ en: "Mode", id: "Mode" })}</th>
            <th className="pb-2 pr-3 font-medium text-right" style={body}>{t({ en: "Last change", id: "Perubahan terakhir" })}</th>
          </tr>
        </thead>
        <tbody>
          {actuators.map((a) => (
            <tr key={a.id} className="border-t border-[#0B6477]/8 text-[13px]" style={body}>
              <td className="py-2.5 pr-3">
                <div className="font-medium text-neutral-800">{a.name}</div>
                {a.kind && <div className="text-[11px] text-neutral-400">{a.kind}</div>}
              </td>
              <td className="py-2.5 pr-3 text-neutral-600">{a.zone || "–"}</td>
              <td className="py-2.5 pr-3">
                <OnOff on={a.is_on} />
                {a.online === false && <span className="ml-2 text-[11px] text-[#C4342F]">{t({ en: "relay offline", id: "relay offline" })}</span>}
              </td>
              <td className="py-2.5 pr-3" style={{ color: a.mode === "auto" ? "#525252" : WARN }}>
                {modeLabel(a.mode, lang)}
              </td>
              <td className="py-2.5 pr-3 text-right text-neutral-500">{agoText(a.changed_at, now, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OnOff({ on }: { on: boolean | null }) {
  const t = useT();
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ ...body, color: on ? GOOD : "#4F6B73", backgroundColor: on ? "#0E9F6E14" : "#4F6B7314" }}
    >
      {on === null ? t({ en: "Unknown", id: "Tidak diketahui" }) : on ? t({ en: "On", id: "Nyala" }) : t({ en: "Off", id: "Mati" })}
    </span>
  );
}

/* ----------------------------------------------------------- series */

export function SeriesChart({
  deviceId,
  deviceName,
  metric,
  range,
  height = 260,
  withStats = false,
}: {
  deviceId: string;
  deviceName: string;
  metric: string;
  range: RangeKey;
  height?: number;
  withStats?: boolean;
}) {
  const { loadSeries } = useFieldData();
  const t = useT();
  const lang = useLang();
  const [points, setPoints] = useState<EdgePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState(() => Date.now());
  const r = RANGES.find((x) => x.key === range)!;
  const meta = metricMeta(metric);

  useEffect(() => {
    let stop = false;
    setPoints(null);
    const at = Date.now();
    void loadSeries(deviceId, metric, r.hours, at).then((res) => {
      if (stop) return;
      setPoints(res.data);
      setError(res.error);
      setEnd(at);
    });
    return () => {
      stop = true;
    };
  }, [deviceId, metric, r.hours, loadSeries]);

  if (error) {
    return (
      <p className="text-[13px] text-[#C4342F]" style={body}>
        {error}
      </p>
    );
  }
  if (points === null) return <Loading text={t({ en: "Loading readings...", id: "Memuat bacaan..." })} />;
  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-neutral-500" style={body}>
        {t({ en: "No readings in this range.", id: "Tidak ada bacaan dalam rentang ini." })}
      </p>
    );
  }

  const stats = seriesStats(points)!;
  const yTicks = niceTicks(stats.min, stats.max);
  const step = stepMinutesFor(r.hours);
  const label = metricLabel(metric, lang);
  const f = (v: number) => fmtMetric(metric, v, lang);
  const summary =
    lang === "id"
      ? `${label} dari ${deviceName}, ${points.length} titik selama ${rangeLabel(range, lang)}. Terbaru ${f(stats.last)}, terendah ${f(stats.min)}, tertinggi ${f(stats.max)}.`
      : `${meta.label} of ${deviceName}, ${points.length} points over ${r.label}. Latest ${formatMetric(metric, stats.last)}, lowest ${formatMetric(metric, stats.min)}, highest ${formatMetric(metric, stats.max)}.`;

  return (
    <>
      {withStats && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              [t({ en: "Latest", id: "Terbaru" }), stats.last],
              [t({ en: "Average", id: "Rata-rata" }), stats.mean],
              [t({ en: "Lowest", id: "Terendah" }), stats.min],
              [t({ en: "Highest", id: "Tertinggi" }), stats.max],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-xl bg-[#F3F7F6] px-3 py-2">
              <div className="text-[11px] text-neutral-500" style={body}>
                {label}
              </div>
              <div className="text-[15px] font-semibold tabular-nums text-neutral-900" style={display}>
                {fmtMetric(metric, v, lang)}
              </div>
            </div>
          ))}
        </div>
      )}
      <TrendChart
        lines={[{ key: metric, label, color: meta.color, format: (v) => fmtMetric(metric, v, lang) }]}
        rows={mergeSeries([{ key: metric, points }], step)}
        from={end - r.hours * 3_600_000}
        to={end}
        height={height}
        yTicks={yTicks}
        formatTick={(v) => fmtMetric(metric, v, lang, false)}
        summary={summary}
      />
      <p className="mt-2 text-[11px] text-neutral-400" style={body}>
        {lang === "id"
          ? `Rata-rata per ${step < 60 ? `${Math.round(step)} menit` : `${String(Math.round(step / 6) / 10).replace(".", ",")} jam`} · waktu dalam WIB`
          : `Averages of ${step < 60 ? `${Math.round(step)} minutes` : `${Math.round(step / 6) / 10} hours`} · times in WIB`}
      </p>
    </>
  );
}

/** Group devices by zone, keeping the order the snapshot gave them. */
export function byZone<T extends { zone: string }>(items: T[], lang: Lang = "en"): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const z = it.zone || (lang === "id" ? "Tanpa zona" : "No zone");
    groups.set(z, [...(groups.get(z) ?? []), it]);
  }
  return [...groups.entries()];
}
