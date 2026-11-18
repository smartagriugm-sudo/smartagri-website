import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { body } from "../lib/fonts";
import { Panel, Pill } from "../components/dashboard/parts";
import { useSiteData } from "../components/greenhouse/FieldData";
import { SeriesChart } from "../components/greenhouse/parts";
import { RANGES, metricMeta, type RangeKey } from "../lib/edge/field";

const ID = /^[A-Za-z0-9_:.-]{1,80}$/;

export const Route = createFileRoute("/indoor-farming_/dashboard/field/trends")({
  // ?device=<id>&metric=<key>: a reading picked on Overview or Sensors.
  validateSearch: (search: Record<string, unknown>) => ({
    device: typeof search.device === "string" && ID.test(search.device) ? search.device : undefined,
    metric: typeof search.metric === "string" && ID.test(search.metric) ? search.metric : undefined,
  }),
  component: GreenhouseTrends,
  head: () => ({ meta: [{ title: "Trends · Greenhouse | agrosphere" }] }),
});

function GreenhouseTrends() {
  const { snap } = useSiteData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [range, setRange] = useState<RangeKey>("24h");

  const withMetrics = snap.devices.filter((d) => d.metrics.length > 0);
  const device = withMetrics.find((d) => d.id === search.device) ?? withMetrics[0] ?? null;
  const metric = device ? (device.metrics.includes(search.metric ?? "") ? search.metric! : device.metrics[0]) : null;

  const choose = (deviceId: string, m: string) =>
    void navigate({ search: (prev) => ({ ...prev, device: deviceId, metric: m }), replace: true });

  if (!device || !metric) {
    return (
      <Panel>
        <p className="text-[13px] text-neutral-500" style={body}>
          This site reports no measured values yet.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title={`${metricMeta(metric).label} · ${device.name || device.source_id}`}
      action={
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Pill key={r.key} active={r.key === range} onClick={() => setRange(r.key)}>
              {r.label}
            </Pill>
          ))}
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-2.5 border-b border-[#0B6477]/8 pb-4">
        {withMetrics.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 shrink-0 text-[11px] text-neutral-400" style={body}>
              Device
            </span>
            {withMetrics.map((d) => (
              <Pill key={d.id} active={d.id === device.id} onClick={() => choose(d.id, d.metrics.includes(metric) ? metric : d.metrics[0])}>
                {d.name || d.source_id}
              </Pill>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 shrink-0 text-[11px] text-neutral-400" style={body}>
            Reading
          </span>
          {device.metrics.map((m) => (
            <Pill key={m} tone={metricMeta(m).color} active={m === metric} onClick={() => choose(device.id, m)}>
              {metricMeta(m).label}
            </Pill>
          ))}
        </div>
      </div>
      <SeriesChart deviceId={device.id} deviceName={device.name || device.source_id} metric={metric} range={range} height={300} withStats />
    </Panel>
  );
}
