import { useContext, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../lib/auth/auth";
import { body } from "../lib/fonts";
import { IF_SECTIONS } from "../lib/indoor-farming";
import { EASE } from "./NoteParts";
import { HeaderThemeContext } from "./SiteHeader";

// Section navigation for /indoor-farming, passed to SiteHeader as `subnav`.
// It hangs from the bottom of the header bar as a slightly narrower, smaller
// strip in the bar's own light/dark colours, so header and sub-menu read as
// one piece. It can be folded away into a small pull tab and opened again.

// Kept for the session (no storage): folding it on one Indoor Farming page
// keeps it folded on the next.
let rememberedOpen = true;

const TONES = {
  dark: {
    strip: "bg-[#08313A]/80 border-white/12",
    link: "text-white/60 hover:text-white",
    label: "text-[#45DFB1]",
    sep: "bg-white/15",
    button: "text-white/60 hover:text-white hover:bg-white/10",
  },
  light: {
    strip: "bg-[#F3F7F6]/92 border-[#0B6477]/15",
    link: "text-[#0B2A22]/55 hover:text-[#0B2A22]",
    label: "text-[#0B6477]",
    sep: "bg-[#0B6477]/15",
    button: "text-[#0B2A22]/55 hover:text-[#0B2A22] hover:bg-[#0B6477]/8",
  },
} as const;

export default function IndoorFarmingNav() {
  // The dashboard is an internal demo tool. Hide the link the same way the
  // site header hides "AI Assistant": visible when auth is switched off, and
  // otherwise only once signed in. The route itself is what enforces access;
  // this is only so visitors are not shown a door they cannot open.
  const { user, isConfigured } = useAuth();
  const showDashboard = !isConfigured || !!user;
  const theme = useContext(HeaderThemeContext);
  const tone = TONES[theme];
  const [open, setOpen] = useState(rememberedOpen);
  const toggle = (next: boolean) => {
    rememberedOpen = next;
    setOpen(next);
  };
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");

  const links = [
    { key: "overview", label: "Overview", to: "/indoor-farming" as const },
    ...IF_SECTIONS.map((s) => ({
      key: s.slug,
      label: s.label,
      to: "/indoor-farming/$section" as const,
      params: { section: s.slug },
    })),
    { key: "instrumentation", label: "Instrumentation", to: "/indoor-farming/instrumentation" as const },
    ...(showDashboard
      ? [{ key: "dashboard", label: "Dashboard", to: "/indoor-farming/dashboard" as const }]
      : []),
    { key: "knowledge", label: "Knowledge", to: "/indoor-farming/knowledge" as const },
  ];

  const rest = pathname.replace(/^\/indoor-farming\/?/, "");
  const active = rest === "" ? "overview" : rest.split("/")[0];
  const activeLabel = links.find((l) => l.key === active)?.label;

  // On narrow screens the links scroll sideways: bring the active one into
  // view (horizontally only, so the page itself does not jump).
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>("[data-on]");
    if (!nav || !el) return;
    nav.scrollLeft = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
  }, [active, open]);

  return (
    <div className="relative mx-3 md:mx-8">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="strip"
            initial={{ opacity: 0, y: -12, clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ opacity: 0, y: -12, clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.4, ease: EASE }}
            className={`-mt-px flex h-10 items-center gap-2 rounded-b-xl border border-t-0 pl-3 pr-1 backdrop-blur-lg transition-colors duration-300 md:pl-4 ${tone.strip}`}
          >
            <Link
              to="/indoor-farming"
              className={`hidden shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] sm:flex ${tone.label}`}
              style={body}
            >
              <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
              Indoor Farming
            </Link>
            <span className={`hidden h-3.5 w-px shrink-0 sm:block ${tone.sep}`} />

            <nav
              ref={navRef}
              aria-label="Indoor Farming"
              className="relative flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {links.map((link) => {
                const on = link.key === active;
                return (
                  <Link
                    key={link.key}
                    to={link.to}
                    params={"params" in link ? link.params : undefined}
                    // Exact matching so only the page itself gets the router's
                    // aria-current; the highlight follows `on`, which also
                    // covers topic pages under a section.
                    activeOptions={{ exact: true }}
                    data-on={on ? "" : undefined}
                    className={`relative shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors ${
                      on ? "text-[#0B2A22]" : tone.link
                    }`}
                    style={body}
                  >
                    {on && (
                      <motion.span
                        layoutId="if-nav-pill"
                        className="absolute inset-0 rounded-md bg-[#45DFB1]"
                        transition={{ duration: 0.45, ease: EASE }}
                      />
                    )}
                    <span className="relative">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => toggle(false)}
              aria-expanded="true"
              aria-label="Hide the Indoor Farming menu"
              title="Hide menu"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors ${tone.button}`}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="tab"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex justify-end"
          >
            <button
              type="button"
              onClick={() => toggle(true)}
              aria-expanded="false"
              aria-label="Show the Indoor Farming menu"
              className={`group -mt-px inline-flex h-7 items-center gap-1.5 rounded-b-lg border border-t-0 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-lg transition-colors duration-300 ${tone.strip} ${tone.label}`}
              style={body}
            >
              <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
              Indoor Farming
              {activeLabel && activeLabel !== "Overview" && (
                <span className="font-medium opacity-60">· {activeLabel}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
