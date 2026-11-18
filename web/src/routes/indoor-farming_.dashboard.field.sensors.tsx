import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { body } from "../lib/fonts";
import { useSiteData } from "../components/greenhouse/FieldData";
import { DeviceCard, byZone } from "../components/greenhouse/parts";
import { latestByKey } from "../lib/edge/field";

export const Route = createFileRoute("/indoor-farming_/dashboard/field/sensors")({
  component: GreenhouseSensors,
  head: () => ({ meta: [{ title: "Sensors · Greenhouse | agrosphere" }] }),
});

function GreenhouseSensors() {
  const { snap, now } = useSiteData();
  const latest = useMemo(() => latestByKey(snap.latest), [snap.latest]);
  const zones = byZone(snap.devices);

  if (snap.devices.length === 0) {
    return (
      <p className="text-[13px] text-neutral-500" style={body}>
        This site reports no sensors.
      </p>
    );
  }

  return (
    <>
      {zones.map(([zone, devices]) => (
        <section key={zone} className="flex flex-col gap-2">
          {zones.length > 1 && (
            <h2 className="px-1 pt-1 text-[13px] font-medium text-neutral-500" style={body}>
              {zone} <span className="text-neutral-400">· {devices.length}</span>
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {devices.map((d) => (
              <DeviceCard key={d.id} device={d} latest={latest} now={now} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
