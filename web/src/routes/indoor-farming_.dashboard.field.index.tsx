import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { body } from "../lib/fonts";
import { Panel } from "../components/dashboard/parts";
import { useSiteData } from "../components/greenhouse/FieldData";
import { BAD, GOOD, WARN, ReadingTile, SeriesChart, StatTile, agoText, deviceState, metricLabel, modeLabel } from "../components/greenhouse/parts";
import { headLang, useLang, useT } from "../lib/i18n";
import { FIELD_BASE } from "../components/greenhouse/nav";
import { headlineReadings, siteOnline, summarize } from "../lib/edge/field";

export const Route = createFileRoute("/indoor-farming_/dashboard/field/")({
  component: GreenhouseOverview,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Ringkasan · Greenhouse | agrosphere" : "Overview · Greenhouse | agrosphere" }] }),
});

function GreenhouseOverview() {
  const { site, snap, now } = useSiteData();
  const sum = useMemo(() => summarize(snap, now), [snap, now]);
  const headlines = useMemo(() => headlineReadings(snap), [snap]);
  const online = siteOnline(site, now);
  const main = headlines[0] ?? null;
  const t = useT();
  const lang = useLang();
  const since = (iso: string | null) => agoText(iso, now, lang);

  const attention: { tone: string; text: ReactNode }[] = [];
  if (!online)
    attention.push({
      tone: BAD,
      text: lang === "id" ? <>Edge PC belum mengirim sejak {since(site.last_seen_at)}.</> : <>Edge PC has not pushed since {since(site.last_seen_at)}.</>,
    });
  for (const d of sum.silent) attention.push({ tone: BAD, text: <><b className="font-medium">{d.name || d.source_id}</b>: {deviceState(d, now, lang).text.toLowerCase()}.</> });
  for (const a of sum.relaysOffline) attention.push({ tone: BAD, text: <><b className="font-medium">{a.name}</b>: {t({ en: "relay offline", id: "relay offline" })}.</> });
  for (const a of sum.notAutomatic)
    attention.push({
      tone: WARN,
      text:
        lang === "id" ? (
          <><b className="font-medium">{a.name}</b> dalam mode {modeLabel(a.mode, lang).toLowerCase()}.</>
        ) : (
          <><b className="font-medium">{a.name}</b> is in {modeLabel(a.mode, lang).toLowerCase()} mode.</>
        ),
    });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Edge PC" value={online ? "Online" : "Offline"} tone={online ? GOOD : BAD} note={`${t({ en: "Last push", id: "Kiriman terakhir" })} ${since(site.last_seen_at)}`} />
        <StatTile
          label={t({ en: "Sensors reporting", id: "Sensor mengirim" })}
          value={`${sum.reporting} ${t({ en: "of", id: "dari" })} ${sum.devices}`}
          tone={sum.silent.length ? BAD : undefined}
          note={sum.silent.length ? `${sum.silent.length} ${t({ en: "silent", id: "diam" })}` : t({ en: "All reporting", id: "Semua mengirim" })}
        />
        <StatTile
          label={t({ en: "Actuators on", id: "Aktuator nyala" })}
          value={`${sum.on} ${t({ en: "of", id: "dari" })} ${sum.actuators}`}
          note={sum.relaysOffline.length ? `${sum.relaysOffline.length} relay offline` : t({ en: "All relays online", id: "Semua relay online" })}
        />
        <StatTile
          label={t({ en: "Newest reading", id: "Bacaan terbaru" })}
          value={sum.newest ? since(sum.newest) : t({ en: "None", id: "Belum ada" })}
          note={t({ en: "10-minute averages", id: "Rata-rata 10 menit" })}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel
          title={t({ en: "Current conditions", id: "Kondisi terkini" })}
          className="xl:col-span-2"
          action={<SectionLink to={`${FIELD_BASE}/sensors`}>{t({ en: "All sensors", id: "Semua sensor" })}</SectionLink>}
        >
          {headlines.length === 0 ? (
            <p className="text-[13px] text-neutral-500" style={body}>
              {t({ en: "No readings yet.", id: "Belum ada bacaan." })}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {headlines.map((h) => (
                <ReadingTile key={h.metric} device={h.device.id} metric={h.metric} value={h.value} caption={h.device.name || h.device.source_id} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t({ en: "Needs attention", id: "Perlu perhatian" })}>
          {attention.length === 0 ? (
            <div className="flex items-start gap-2 text-[13px] text-neutral-600" style={body}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOOD }} />
              {t({ en: "Every sensor is reporting and every relay is online.", id: "Semua sensor mengirim data dan semua relay online." })}
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {attention.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-neutral-700" style={body}>
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: a.tone }} />
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {main && (
        <Panel
          title={`${metricLabel(main.metric, lang)} · ${t({ en: "last 24 hours", id: "24 jam terakhir" })}`}
          action={<SectionLink to={`${FIELD_BASE}/trends`}>{t({ en: "Open trends", id: "Buka tren" })}</SectionLink>}
        >
          <SeriesChart deviceId={main.device.id} deviceName={main.device.name || main.device.source_id} metric={main.metric} range="24h" height={220} />
        </Panel>
      )}
    </>
  );
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0B6477] hover:text-[#14919B]" style={body}>
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
