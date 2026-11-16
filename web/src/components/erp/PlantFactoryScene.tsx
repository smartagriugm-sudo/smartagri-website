import { useEffect, useRef } from "react";
import type { PlantFactoryScene as Engine, Selection } from "plant-factory-3d";
import { loadModel, modelShown, weakDevice } from "../../lib/pf/model-load";
import { HOLE_STATES } from "../../lib/pf/facility";
import type { PfProvider } from "../../lib/pf/provider";

// Mounts the plant-factory-3d engine. The model, camera, lighting and picking
// all live in that package (its GLB is not to be edited here); this component
// only ties its lifetime to React. The engine needs the browser, so it is
// imported inside the effect, which also keeps three.js out of every other
// page's bundle.

export type SceneEngine = Engine<PfProvider>;

type Props = {
  provider: PfProvider;
  onReady: (engine: SceneEngine) => void;
  onSelect: (selection: Selection | null) => void;
  onError: (error: unknown) => void;
  /** Extra states on top of the usual ones, for a picker that marks what is chosen. */
  states?: Record<string, { label: string; color: number }>;
};

export default function PlantFactoryScene({ provider, onReady, onSelect, onError, states }: Props) {
  const container = useRef<HTMLDivElement>(null);
  // The engine outlives re-renders, so it calls through a ref to the latest props.
  const handlers = useRef({ onReady, onSelect, onError });
  handlers.current = { onReady, onSelect, onError };

  useEffect(() => {
    let engine: SceneEngine | undefined;
    let cancelled = false;
    let release = () => {};
    Promise.all([import("plant-factory-3d"), loadModel("plantFactory")])
      .then(([{ createPlantFactoryScene }, { release: free, ...urls }]) => {
        release = free;
        return createPlantFactoryScene<PfProvider>({
          container: container.current!,
          ...urls,
          provider,
          holeStates: states ? { ...HOLE_STATES, ...states } : HOLE_STATES,
          tooltip: false,
          lite: weakDevice(),
        });
      })
      .then((created) => {
        if (cancelled) return created.dispose();
        engine = created;
        modelShown("plantFactory");
        created.on("select", (s) => handlers.current.onSelect(s));
        handlers.current.onReady(created);
      })
      .finally(() => release())
      .catch((e) => {
        modelShown("plantFactory");
        if (!cancelled) handlers.current.onError(e);
      });
    return () => {
      cancelled = true;
      engine?.dispose();
    };
  }, [provider]);

  return <div ref={container} className="absolute inset-0 overflow-hidden" />;
}
