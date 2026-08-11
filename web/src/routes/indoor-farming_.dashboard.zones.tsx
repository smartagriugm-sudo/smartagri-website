import { createFileRoute } from "@tanstack/react-router";
import { CircleDot } from "lucide-react";
import { body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  ROOT_KEYS,
  STATUS_TONE,
  ZONES,
  formatValue,
  METRICS,
  readingAt,
  statusOf,
  targetFor,
} from "../lib/indoor-dashboard";
import { useDashboard } from "../lib/dashboard-state";
import { Panel, StatusDot } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { DASHBOARD_NAV } from "../lib/indoor-dashboard";

export const Route = createFileRoute("/indoor-farming_/dashboard/zones")({
  component: ZonesScreen,
  head: () => ({ meta: [{ title: "Zones · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.label === "Zones")!;

function ZonesScreen() {
  const { tick, zoneId, setZoneId, zoneStatus } = useDashboard();

  return (
    <>
      <ScreenHeading title="Zones" blurb={NAV.blurb} />

      {/* One card per zone. Selecting a card sets the facility-wide selection,
          so returning to Overview or Climate lands on the same zone. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ZONES.map((z) => {
          const reading = readingAt(z, tick);
          const status = zoneStatus(z);
          const selected = z.id === zoneId;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => setZoneId(z.id)}
              className={`min-w-0 rounded-2xl border bg-white p-5 text-left transition-colors ${
                selected
                  ? "border-[#0B6477]/40 ring-1 ring-[#0B6477]/20"
                  : "border-[#0B6477]/10 hover:border-[#14919B]/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CircleDot
                      className="w-3 h-3 shrink-0"
                      style={{ color: z.online ? "#0E9F6E" : "#C4342F" }}
                    />
                    <span
                      className="text-[15px] font-medium text-neutral-900 truncate"
                      style={display}
                    >
                      {z.name}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-neutral-500 truncate" style={body}>
                    {z.crop}
                  </div>
                </div>
                <StatusDot status={status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400" style={body}>
                <span>{z.area} m²</span>
                <span className="capitalize">{z.kind.replace("-", " ")}</span>
                <span>{z.stage}</span>
              </div>

              {z.online ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(["airTemp", "vpd", "ec"] as const).map((k) => {
                    const s = statusOf(k, reading[k], z);
                    return (
                      <div key={k} className="rounded-xl bg-[#F3F7F6] px-2.5 py-2">
                        <div className="text-[10px] text-neutral-400 truncate" style={body}>
                          {METRICS[k].short}
                        </div>
                        <div
                          className="text-[14px] font-semibold tabular-nums"
                          style={{ ...display, color: STATUS_TONE[s].color }}
                        >
                          {formatValue(k, reading[k])}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#F3F7F6] px-3 py-2.5 text-[12px] text-neutral-500" style={body}>
                  Offline since 06:10. Controller in maintenance, no readings are
                  being recorded.
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Full metric table for whichever zone is selected. */}
      <ZoneDetail />
    </>
  );
}

// Metrics driven by a schedule rather than held at a setpoint. A dark room at
// 02:00 and a closed irrigation valve are correct states, so colouring them
// against a target band would report normal operation as a fault. The same
// exclusion is applied when rolling a zone up to a single status.
const SCHEDULED = new Set(["flow", "ppfd", "dli"]);

function ZoneDetail() {
  const { zone, tick } = useDashboard();
  const reading = readingAt(zone, tick);
  const keys = [...AERIAL_KEYS, ...ROOT_KEYS];

  return (
    <Panel
      title={`All readings · ${zone.name}`}
      action={
        <span className="text-[11px] text-neutral-400" style={body}>
          {zone.crop}
        </span>
      }
    >
      {!zone.online ? (
        <p className="py-6 text-center text-[13px] text-neutral-400" style={body}>
          This zone is offline, so there is nothing to report.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {keys.map((k) => {
            const metric = METRICS[k];
            const value = reading[k];
            const scheduled = SCHEDULED.has(k);
            const status = statusOf(k, value, zone);
            const tone = scheduled ? "#8A94A6" : STATUS_TONE[status].color;
            const [lo, hi] = targetFor(k, zone);
            return (
              <div
                key={k}
                className="flex items-center gap-3 rounded-xl border border-[#0B6477]/8 bg-[#FAFCFB] px-3.5 py-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${tone}1A` }}
                >
                  <metric.icon className="w-4 h-4" style={{ color: tone }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-neutral-400 truncate" style={body}>
                    {metric.label}
                  </div>
                  <div className="text-[10px] text-neutral-400" style={body}>
                    {scheduled
                      ? `On schedule · ${lo} to ${hi} ${metric.unit} when running`
                      : `Target ${lo} to ${hi} ${metric.unit}`}
                  </div>
                </div>
                <span
                  className="text-[15px] font-semibold tabular-nums shrink-0"
                  style={{ ...display, color: tone }}
                >
                  {formatValue(k, value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
