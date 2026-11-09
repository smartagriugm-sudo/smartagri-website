import { useEffect, useRef } from "react";
import type { ChamberSelection, SeedChamberScene as Engine } from "plant-factory-3d";
import { modelUrls } from "../../lib/pf/model-assets";
import { SLOT_STATES, type ChamberProvider } from "../../lib/pf/chamber";

// Mounts the growth chamber engine; the same arrangement as PlantFactoryScene.
// Its GLB is not to be edited here, and the doors it animates are only a view
// of the model, not the state of the real doors.

export type ChamberEngine = Engine<ChamberProvider>;

type Props = {
  provider: ChamberProvider;
  onReady: (engine: ChamberEngine) => void;
  onSelect: (selection: ChamberSelection | null) => void;
  onError: (error: unknown) => void;
  /** Extra states on top of the usual ones, for a picker that marks what is chosen. */
  states?: Record<string, { label: string; color: number }>;
};

export default function SeedChamberScene({ provider, onReady, onSelect, onError, states }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onSelect, onError });
  handlers.current = { onReady, onSelect, onError };

  useEffect(() => {
    let engine: ChamberEngine | undefined;
    let cancelled = false;
    Promise.all([import("plant-factory-3d"), modelUrls("chamber")])
      .then(([{ createSeedChamberScene }, urls]) =>
        createSeedChamberScene<ChamberProvider>({
          container: container.current!,
          ...urls,
          provider,
          slotStates: states ? { ...SLOT_STATES, ...states } : SLOT_STATES,
          tooltip: false,
        }),
      )
      .then((created) => {
        if (cancelled) return created.dispose();
        engine = created;
        created.on("select", (s) => handlers.current.onSelect(s));
        handlers.current.onReady(created);
      })
      .catch((e) => {
        if (!cancelled) handlers.current.onError(e);
      });
    return () => {
      cancelled = true;
      engine?.dispose();
    };
  }, [provider]);

  return <div ref={container} className="absolute inset-0 overflow-hidden" />;
}
