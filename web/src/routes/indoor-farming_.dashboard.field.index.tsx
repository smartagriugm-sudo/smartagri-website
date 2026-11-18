import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { body } from "../lib/fonts";
import { Panel } from "../components/dashboard/parts";
import { useSiteData } from "../components/greenhouse/FieldData";
import { BAD, GOOD, WARN, ReadingTile, SeriesChart, StatTile, deviceState } from "../components/greenhouse/parts";
import { FIELD_BASE } from "../components/greenhouse/nav";
import { MODE_LABEL, ago, headlineReadings, metricMeta, siteOnline, summarize } from "../lib/edge/field";

export const Route = createFileRoute("/indoor-farming_/dashboard/field/")({
  component: GreenhouseOverview,
  head: () => ({ meta: [{ title: "Overview · Greenhouse | agrosphere" }] }),
});

function GreenhouseOverview() {
  const { site, snap, now } = useSiteData();
  const sum = useMemo(() => summarize(snap, now), [snap, now]);
  const headlines = useMemo(() => headlineReadings(snap), [snap]);
  const online = siteOnline(site, now);
  const main = headlines[0] ?? null;

  const attention: { tone: string; text: ReactNode }[] = [];
  if (!online) attention.push({ tone: BAD, text: <>Edge PC has not pushed since {ago(site.last_seen_at, now)}.</> });
  for (const d of sum.silent) attention.push({ tone: BAD, text: <><b className="font-medium">{d.name || d.source_id}</b>: {deviceState(d, now).text.toLowerCase()}.</> });
  for (const a of sum.relaysOffline) attention.push({ tone: BAD, text: <><b className="font-medium">{a.name}</b>: relay offline.</> });
  for (const a of sum.notAutomatic) attention.push({ tone: WARN, text: <><b className="font-medium">{a.name}</b> is in {(MODE_LABEL[a.mode] ?? a.mode).toLowerCase()} mode.</> });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Edge PC" value={online ? "Online" : "Offline"} tone={online ? GOOD : BAD} note={`Last push ${ago(site.last_seen_at, now)}`} />
        <StatTile
          label="Sensors reporting"
          value={`${sum.reporting} of ${sum.devices}`}
          tone={sum.silent.length ? BAD : undefined}
          note={sum.silent.length ? `${sum.silent.length} silent` : "All reporting"}
        />
        <StatTile
          label="Actuators on"
          value={`${sum.on} of ${sum.actuators}`}
          note={sum.relaysOffline.length ? `${sum.relaysOffline.length} relay offline` : "All relays online"}
        />
        <StatTile label="Newest reading" value={sum.newest ? ago(sum.newest, now) : "None"} note="10-minute averages" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Current conditions" className="xl:col-span-2" action={<SectionLink to={`${FIELD_BASE}/sensors`}>All sensors</SectionLink>}>
          {headlines.length === 0 ? (
            <p className="text-[13px] text-neutral-500" style={body}>
              No readings yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {headlines.map((h) => (
                <ReadingTile key={h.metric} device={h.device.id} metric={h.metric} value={h.value} caption={h.device.name || h.device.source_id} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Needs attention">
          {attention.length === 0 ? (
            <div className="flex items-start gap-2 text-[13px] text-neutral-600" style={body}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOOD }} />
              Every sensor is reporting and every relay is online.
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
          title={`${metricMeta(main.metric).label} · last 24 hours`}
          action={<SectionLink to={`${FIELD_BASE}/trends`}>Open trends</SectionLink>}
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
