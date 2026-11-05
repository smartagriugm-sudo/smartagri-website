import { useCallback, useRef, useState, type ReactNode } from "react";
import { useRouterState, useSearch } from "@tanstack/react-router";
import PlantFactoryOverview from "./PlantFactoryOverview";
import SeedChamberPage from "./SeedChamberPage";

// Both facility screens stay alive from the first visit to either one until the
// ERP is closed, so switching tabs is instant and keeps each camera, filter and
// selection. The URL only decides which one shows; their routes render nothing.
// Someone who only opens the data pages never loads a model.
//
// The hidden screen keeps its full size instead of display: none, so its 3D
// engine frames the model for the real canvas, and it stops drawing while
// hidden (useEngineActivity). On a large screen the second model loads shortly
// after the first. On a phone, where holding two is costly, it loads on first
// visit and stays from then on.

const PRELOAD_DELAY_MS = 800;

function Screen({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={active ? "flex flex-1 flex-col" : "invisible absolute left-0 top-0 h-screen w-full overflow-hidden"}>
      {children}
    </div>
  );
}

export default function ErpScreens() {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const search = useSearch({ strict: false }) as { hole?: string; slot?: string };
  const chamber = pathname.endsWith("/persemaian");
  const factory = pathname.endsWith("/plant-factory");

  const [visited, setVisited] = useState(false);
  if ((chamber || factory) && !visited) setVisited(true);

  const [preload, setPreload] = useState(false);
  const scheduled = useRef(false);
  const onSceneReady = useCallback(() => {
    if (scheduled.current || !window.matchMedia("(min-width: 1024px)").matches) return;
    scheduled.current = true;
    window.setTimeout(() => setPreload(true), PRELOAD_DELAY_MS);
  }, []);

  if (!visited) return null;

  return (
    <>
      <Screen active={chamber}>
        <SeedChamberPage active={chamber} preload={preload} onSceneReady={onSceneReady} focusSlot={search.slot} />
      </Screen>
      <Screen active={factory}>
        <PlantFactoryOverview active={factory} preload={preload} onSceneReady={onSceneReady} focusHole={search.hole} />
      </Screen>
    </>
  );
}
