import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Home, Minus, Plus } from "lucide-react";
import type { ErpStore } from "../../lib/pf/store";
import type { ChamberEngine } from "./SeedChamberScene";
import type { SceneEngine } from "./PlantFactoryScene";
import { SceneStatus, Segmented, dolly, useEngineActivity } from "./ui";

// The live 3D model on the front page, one facility at a time. It is a look, not
// the workplace: dragging turns it, the wheel still scrolls the page, and picking
// a hole or a tray opens that spot on its full screen. It holds its own engine and
// gives it back on leaving the page, and draws only while on screen. Phones do not
// get it: a model is costly there, and a drag on it would fight the page's scroll.

const PlantFactoryScene = lazy(() => import("./PlantFactoryScene"));
const SeedChamberScene = lazy(() => import("./SeedChamberScene"));

type Facility = "plant-factory" | "persemaian";
type AnyEngine = SceneEngine | ChamberEngine;

const FACILITIES: { key: Facility; label: string }[] = [
  { key: "plant-factory", label: "Plant factory" },
  { key: "persemaian", label: "Persemaian" },
];

const tool = "grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]";

export function useLargeScreen() {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setLarge(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return large;
}

export default function FacilityViewer({ store }: { store: ErpStore }) {
  const [facility, setFacility] = useState<Facility>("plant-factory");
  const [engine, setEngine] = useState<AnyEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEngineActivity(engine, visible);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const seen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    seen.observe(el);
    // Before the engine's own listener on the canvas: the wheel belongs to the page here.
    const keepScroll = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", keepScroll, { capture: true, passive: true });
    return () => {
      seen.disconnect();
      el.removeEventListener("wheel", keepScroll, { capture: true });
    };
  }, []);

  useEffect(() => {
    engine?.refresh();
  }, [engine, store.dataVersion]);

  const choose = (next: Facility) => {
    if (next === facility) return;
    setEngine(null);
    setFailed(false);
    setFacility(next);
  };

  const onReady = useCallback((e: AnyEngine) => setEngine(e), []);
  const onError = useCallback((e: unknown) => {
    console.error("Model 3D gagal dimuat", e);
    setFailed(true);
  }, []);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-[#DCE7E8] bg-white" aria-labelledby="viewer-title">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
        <h2 id="viewer-title" className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Tampilan 3D</h2>
        <Segmented value={facility} options={FACILITIES} onChange={choose} />
      </div>
      <div ref={stage} className="relative min-h-[340px] flex-1 overflow-hidden border-t border-[#EDF2F2] bg-[#E7EAE7]">
        <Suspense fallback={<SceneStatus failed={false} />}>
          {facility === "plant-factory" ? (
            <PlantFactoryScene
              key="pf"
              provider={store.pf}
              onReady={onReady}
              onError={onError}
              onSelect={(s) => {
                if (s?.kind === "hole") void navigate({ to: "/erp/plant-factory", search: { hole: s.id } });
              }}
            />
          ) : (
            <SeedChamberScene
              key="ch"
              provider={store.chamber}
              onReady={onReady}
              onError={onError}
              onSelect={(s) => {
                if (s?.kind === "slot") void navigate({ to: "/erp/persemaian", search: { slot: s.id } });
              }}
            />
          )}
        </Suspense>
        {!engine && <SceneStatus failed={failed} />}
        <div className="absolute right-2.5 top-2.5 flex flex-col rounded-lg border border-[#DCE7E8] bg-white p-0.5">
          <button type="button" className={tool} disabled={!engine} onClick={() => engine && dolly(engine, 0.8)} aria-label="Perbesar"><Plus className="h-4 w-4" /></button>
          <button type="button" className={tool} disabled={!engine} onClick={() => engine && dolly(engine, 1.25)} aria-label="Perkecil"><Minus className="h-4 w-4" /></button>
          <button
            type="button"
            className={tool}
            disabled={!engine}
            aria-label="Tampilan awal"
            onClick={() => {
              if (facility === "plant-factory") (engine as SceneEngine | null)?.setView("iso");
              else (engine as ChamberEngine | null)?.setView("overview");
            }}
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2.5 text-[13px]">
        <span className="text-[#4F6B73]">Seret untuk memutar model</span>
        <Link to={facility === "plant-factory" ? "/erp/plant-factory" : "/erp/persemaian"} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-[#0B6477] hover:underline">
          Buka layar penuh <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
