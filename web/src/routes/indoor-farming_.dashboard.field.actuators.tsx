import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { body } from "../lib/fonts";
import { Panel } from "../components/dashboard/parts";
import { useSiteData } from "../components/greenhouse/FieldData";
import { ActuatorTable, BAD, GOOD, StatTile, WARN } from "../components/greenhouse/parts";
import { summarize } from "../lib/edge/field";

export const Route = createFileRoute("/indoor-farming_/dashboard/field/actuators")({
  component: GreenhouseActuators,
  head: () => ({ meta: [{ title: "Actuators · Greenhouse | agrosphere" }] }),
});

function GreenhouseActuators() {
  const { snap, now } = useSiteData();
  const sum = useMemo(() => summarize(snap, now), [snap, now]);
  const off = snap.actuators.filter((a) => a.is_on === false).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="On" value={sum.on} tone={sum.on ? GOOD : undefined} note={`of ${sum.actuators} actuators`} />
        <StatTile label="Off" value={off} note={sum.actuators - sum.on - off > 0 ? `${sum.actuators - sum.on - off} unknown` : "State known for all"} />
        <StatTile label="Not automatic" value={sum.notAutomatic.length} tone={sum.notAutomatic.length ? WARN : undefined} note="Manual or paused" />
        <StatTile label="Relays offline" value={sum.relaysOffline.length} tone={sum.relaysOffline.length ? BAD : undefined} note="As the edge PC last saw" />
      </div>
      <Panel
        title="All actuators"
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            State as the edge PC last saw it · read only
          </span>
        }
      >
        <ActuatorTable actuators={snap.actuators} now={now} />
      </Panel>
    </>
  );
}
