import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { body } from "../lib/fonts";
import { Panel } from "../components/dashboard/parts";
import { useSiteData } from "../components/greenhouse/FieldData";
import { ActuatorTable, BAD, GOOD, StatTile, WARN } from "../components/greenhouse/parts";
import { summarize } from "../lib/edge/field";
import { headLang, useT } from "../lib/i18n";

export const Route = createFileRoute("/indoor-farming_/dashboard/field/actuators")({
  component: GreenhouseActuators,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Aktuator · Greenhouse | agrosphere" : "Actuators · Greenhouse | agrosphere" }] }),
});

function GreenhouseActuators() {
  const { snap, now } = useSiteData();
  const sum = useMemo(() => summarize(snap, now), [snap, now]);
  const off = snap.actuators.filter((a) => a.is_on === false).length;
  const t = useT();
  const unknown = sum.actuators - sum.on - off;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label={t({ en: "On", id: "Nyala" })}
          value={sum.on}
          tone={sum.on ? GOOD : undefined}
          note={t({ en: `of ${sum.actuators} actuators`, id: `dari ${sum.actuators} aktuator` })}
        />
        <StatTile
          label={t({ en: "Off", id: "Mati" })}
          value={off}
          note={unknown > 0 ? t({ en: `${unknown} unknown`, id: `${unknown} tidak diketahui` }) : t({ en: "State known for all", id: "Kondisi semua diketahui" })}
        />
        <StatTile
          label={t({ en: "Not automatic", id: "Tidak otomatis" })}
          value={sum.notAutomatic.length}
          tone={sum.notAutomatic.length ? WARN : undefined}
          note={t({ en: "Manual or paused", id: "Manual atau jeda" })}
        />
        <StatTile
          label={t({ en: "Relays offline", id: "Relay offline" })}
          value={sum.relaysOffline.length}
          tone={sum.relaysOffline.length ? BAD : undefined}
          note={t({ en: "As the edge PC last saw", id: "Menurut pembacaan terakhir edge PC" })}
        />
      </div>
      <Panel
        title={t({ en: "All actuators", id: "Semua aktuator" })}
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            {t({ en: "State as the edge PC last saw it · read only", id: "Kondisi menurut pembacaan terakhir edge PC · hanya baca" })}
          </span>
        }
      >
        <ActuatorTable actuators={snap.actuators} now={now} />
      </Panel>
    </>
  );
}
