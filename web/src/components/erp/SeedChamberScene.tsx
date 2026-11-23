import { useEffect, useRef } from "react";
import type { ChamberSelection, SeedChamberScene as Engine } from "plant-factory-3d";
import { loadModel, modelShown, weakDevice } from "../../lib/pf/model-load";
import { slotStatesIn, type ChamberProvider } from "../../lib/pf/chamber";
import { useLang } from "../../lib/i18n";

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
  // The engine is built once per provider; it takes the labels of the language at that moment.
  const lang = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    let engine: ChamberEngine | undefined;
    let cancelled = false;
    let release = () => {};
    Promise.all([import("plant-factory-3d"), loadModel("chamber")])
      .then(([{ createSeedChamberScene }, { release: free, ...urls }]) => {
        release = free;
        return createSeedChamberScene<ChamberProvider>({
          container: container.current!,
          ...urls,
          provider,
          slotStates: states ? { ...slotStatesIn(langRef.current), ...states } : slotStatesIn(langRef.current),
          tooltip: false,
          lite: weakDevice(),
        });
      })
      .then((created) => {
        if (cancelled) return created.dispose();
        engine = created;
        modelShown("chamber");
        created.on("select", (s) => handlers.current.onSelect(s));
        handlers.current.onReady(created);
      })
      .finally(() => release())
      .catch((e) => {
        modelShown("chamber");
        if (!cancelled) handlers.current.onError(e);
      });
    return () => {
      cancelled = true;
      engine?.dispose();
    };
  }, [provider]);

  return <div ref={container} className="absolute inset-0 overflow-hidden" />;
}
