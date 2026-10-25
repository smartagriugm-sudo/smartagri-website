import { useEffect, useRef, useState } from "react";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { A } from "../lib/assets";

// Page-load and page-transition curtain (after the Blitz template): a deep
// panel with mint edges and the smartagri logo.
//   - First load: the server renders it already covering the page, and it
//     lifts once the app has hydrated, so content never flashes in unstyled.
//   - Every navigation to another page: it slides up over the screen (0.42s),
//     the route changes behind it, then it lifts away (0.65s). Changes that
//     only touch the hash or search (anchors, filters) don't trigger it.
// Navigation is only delayed, never blocked. Reduced motion hides it (CSS),
// and a CSS failsafe lifts it if JavaScript never runs. Moving within one
// Kanban board (opening or closing a card, which is a nested route) stays on
// the same page, so it is not a page change either.
const COVER_MS = 420;
const LIFT_MS = 650;

function samePage(from: string, to: string) {
  if (from === to) return true;
  const board = (p: string) => p.match(/^\/kanban\/[^/]+/)?.[0];
  return !!board(from) && board(from) === board(to);
}

type Phase = "load" | "idle" | "cover" | "reveal";

export default function PageCurtain() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("load");
  const covering = useRef(false);
  const reduced = useRef(false);

  // First load: lift shortly after hydration.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setPhase("idle");
      return;
    }
    let done: number | undefined;
    const lift = window.setTimeout(() => {
      setPhase("reveal");
      done = window.setTimeout(() => setPhase("idle"), LIFT_MS);
    }, 450);
    return () => {
      window.clearTimeout(lift);
      window.clearTimeout(done);
    };
  }, []);

  useBlocker({
    enableBeforeUnload: false,
    shouldBlockFn: async ({ current, next }) => {
      if (reduced.current || samePage(current.pathname, next.pathname)) return false;
      covering.current = true;
      setPhase("cover");
      await new Promise((r) => setTimeout(r, COVER_MS));
      return false; // never block, only delay
    },
  });

  useEffect(() => {
    let lift: number | undefined;
    let done: number | undefined;
    const unsub = router.subscribe("onResolved", () => {
      if (!covering.current) return;
      covering.current = false;
      lift = window.setTimeout(() => {
        setPhase("reveal");
        done = window.setTimeout(() => setPhase("idle"), LIFT_MS);
      }, 120);
    });
    return () => {
      unsub();
      window.clearTimeout(lift);
      window.clearTimeout(done);
    };
  }, [router]);

  return (
    <div
      aria-hidden="true"
      data-curtain=""
      data-phase={phase}
      className="sa-curtain flex flex-col bg-[#08313A]"
    >
      <span className="h-1 w-full bg-[#45DFB1]" />
      <div className="sa-curtain-content flex flex-1 flex-col items-center justify-center gap-6">
        <img src={A.logoWhite} alt="" className="h-10 w-auto md:h-12" />
        <span className="relative h-[2px] w-28 overflow-hidden rounded-full bg-white/15">
          <span className="sa-curtain-bar absolute inset-y-0 left-0 w-1/2 rounded-full bg-[#45DFB1]" />
        </span>
      </div>
      <span className="h-1 w-full bg-[#45DFB1]" />
    </div>
  );
}
