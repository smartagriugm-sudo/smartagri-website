import { createContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  SquareKanban,
  Users,
  X,
} from "lucide-react";
import { A } from "../lib/assets";
import { body } from "../lib/fonts";
import { useAuth } from "../lib/auth/auth";
import { EXHIBITION_LIVE } from "../lib/exhibition";
import { AI_ASSISTANT_ENABLED } from "../lib/features";

type NavLink = { label: string; to: string; highlight?: boolean };
type Theme = "dark" | "light";

const leadLinks: NavLink[] = [
  { label: "Research", to: "/research" },
  { label: "Technology", to: "/technology" },
];
// Always grouped under the "Media" dropdown to keep the bar compact.
const mediaLinks: NavLink[] = [
  { label: "Publications", to: "/publications" },
  { label: "Field Notes", to: "/field-notes" },
  { label: "Gallery", to: "/gallery" },
];
const tailLinks: NavLink[] = [{ label: "About Us", to: "/about-us" }];
// Highlighted: Exhibition is a time-bound annual event, not a permanent page.
const eventLink: NavLink = {
  label: "INAGRITECH 26",
  to: "/exhibition",
  highlight: true,
};

// Shown only to signed-in research assistants (or when auth is disabled).
const AI_LINK: NavLink = { label: "AI Assistant", to: "/ai" };

// Colours for the floating bar on a dark or a light backdrop.
const THEMES = {
  dark: {
    bar: "bg-[#08313A]/80 border-white/12",
    text: "text-white/75",
    textHover: "group-hover:text-white",
    active: "text-white",
    sep: "bg-white/20",
    marker: "bg-[#45DFB1]",
    logo: A.logoWhite,
    toggle: "text-white",
    panel: "bg-[#08313A] border-white/10",
    item: "text-white/80 hover:text-white hover:bg-white/10",
    muted: "text-white/40",
    strong: "text-white/90",
    divider: "bg-white/10",
  },
  light: {
    bar: "bg-[#F3F7F6]/92 border-[#0B6477]/15",
    text: "text-[#0B2A22]/65",
    textHover: "group-hover:text-[#0B2A22]",
    active: "text-[#0B2A22]",
    sep: "bg-[#0B6477]/20",
    marker: "bg-[#14919B]",
    logo: A.logoColor,
    toggle: "text-[#0B2A22]",
    panel: "bg-white border-[#0B6477]/12",
    item: "text-[#0B2A22]/75 hover:text-[#0B2A22] hover:bg-[#0B6477]/8",
    muted: "text-[#0B2A22]/45",
    strong: "text-[#0B2A22]/90",
    divider: "bg-[#0B6477]/10",
  },
} as const;

type ThemeTokens = (typeof THEMES)[Theme];

// Lets a section sub-nav attached under the bar (see `subnav`) follow the
// bar's light/dark theme.
export const HeaderThemeContext = createContext<Theme>("light");

// Resolves any CSS colour string (rgb, oklab, color-mix...) to RGBA by
// painting it on a 1x1 canvas.
let probe: CanvasRenderingContext2D | null = null;
function toRgba(color: string): [number, number, number, number] | null {
  if (!color || color === "transparent") return null;
  if (!probe) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    probe = c.getContext("2d", { willReadFrequently: true });
  }
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

// Picks the bar theme from whatever sits under the header: an explicit
// data-header-theme="dark|light" wins, otherwise the first opaque background
// colour in the stack decides by luminance.
function useBackdropTheme(ref: RefObject<HTMLElement | null>, fallback: Theme) {
  const [theme, setTheme] = useState<Theme>(fallback);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const header = ref.current;
      if (!header) return;
      const rect = header.getBoundingClientRect();
      const stack = document.elementsFromPoint(
        window.innerWidth / 2,
        rect.top + rect.height / 2,
      );
      for (const node of stack) {
        if (header.contains(node)) continue;
        // The page curtain covers everything while it moves; look past it.
        if (node.closest("[data-curtain]")) continue;
        const tagged = node.closest<HTMLElement>("[data-header-theme]");
        const explicit = tagged?.dataset.headerTheme;
        if (explicit === "dark" || explicit === "light") {
          setTheme(explicit);
          return;
        }
        const rgba = toRgba(getComputedStyle(node).backgroundColor);
        if (rgba && rgba[3] > 0.5) {
          const [r, g, b] = rgba;
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          setTheme(lum < 0.5 ? "dark" : "light");
          return;
        }
      }
      setTheme("light");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };

    schedule();
    // Re-check once the new page has painted after client navigation.
    const settle = window.setTimeout(schedule, 150);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, pathname]);

  return theme;
}

// Pulsing "live event" dot shown next to highlighted (event) nav items.
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#45DFB1] opacity-75 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#45DFB1]" />
    </span>
  );
}

const ROLL =
  "block transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none";

// Label that rolls up on hover: the word slides out the top while a copy
// slides in from below, with a small square marker appearing on its left.
function RollLabel({
  label,
  active,
  t,
}: {
  label: string;
  active: boolean;
  t: ThemeTokens;
}) {
  return (
    <span className="relative inline-flex items-center">
      <span
        aria-hidden="true"
        className={`absolute -left-3.5 top-1/2 -mt-[3px] h-1.5 w-1.5 ${t.marker} transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          active ? "scale-100" : "scale-0 group-hover:scale-100 group-focus-visible:scale-100"
        }`}
      />
      <span className="relative block overflow-hidden leading-[1.4]">
        <span className={ROLL}>{label}</span>
        <span aria-hidden="true" className={`absolute left-0 top-full ${ROLL}`}>
          {label}
        </span>
      </span>
    </span>
  );
}

const NAV_TEXT = "text-[13px] font-medium uppercase tracking-[0.08em] whitespace-nowrap";

function DesktopNavLink({ link, t }: { link: NavLink; t: ThemeTokens }) {
  if (link.highlight) {
    return (
      <Link
        to={link.to}
        className={`group inline-flex items-center gap-1.5 ${NAV_TEXT} text-[#45DFB1] hover:text-[#80ED99] transition-colors`}
        style={body}
      >
        <RollLabel label={link.label} active={false} t={t} />
        <LiveDot />
      </Link>
    );
  }
  return (
    <Link to={link.to} className={`group ${NAV_TEXT}`} style={body}>
      {({ isActive }) => (
        <span className={`transition-colors ${isActive ? t.active : `${t.text} ${t.textHover}`}`}>
          <RollLabel label={link.label} active={isActive} t={t} />
        </span>
      )}
    </Link>
  );
}

function Separator({ t }: { t: ThemeTokens }) {
  return <span aria-hidden="true" className={`h-3 w-px ${t.sep}`} />;
}

function MediaDropdown({ t, pathname }: { t: ThemeTokens; pathname: string }) {
  const active = mediaLinks.some((l) => pathname.startsWith(l.to));
  return (
    <div className="relative group">
      <button
        type="button"
        className={`inline-flex items-center gap-1 ${NAV_TEXT} transition-colors ${
          active ? t.active : `${t.text} ${t.textHover}`
        }`}
        style={body}
        aria-haspopup="true"
      >
        <RollLabel label="Media" active={active} t={t} />
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-5 z-50 opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0">
        <div className={`min-w-[190px] rounded-xl border shadow-xl p-2 flex flex-col ${t.panel}`}>
          {mediaLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-[15px] transition-colors ${t.item}`}
              style={body}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact signed-in account control: the profile photo (or the name's
// initials) that reveals the name, email, shortcuts and Sign out on hover/focus.
function AccountMenu({
  email,
  name,
  avatarUrl,
  isAdmin,
  onSignOut,
  t,
}: {
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  onSignOut: () => void;
  t: ThemeTokens;
}) {
  const parts = (name || email).trim().split(/[\s@]+/).filter(Boolean);
  const initial = name
    ? ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
    : (email.trim()[0] || "?").toUpperCase();
  const row = `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${t.item}`;
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#45DFB1] text-[#0B2A22] text-sm font-semibold transition-colors hover:bg-[#80ED99]"
        style={body}
        aria-haspopup="true"
        aria-label={name ? `Account menu: ${name}` : "Account menu"}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
      </button>
      <div className="absolute right-0 top-full pt-4 z-50 opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0">
        <div className={`min-w-[220px] rounded-xl border shadow-xl p-2 ${t.panel}`}>
          <div className="px-3 py-2">
            <div className={`text-[11px] uppercase tracking-[0.12em] ${t.muted}`} style={body}>
              Signed in as
            </div>
            {name && (
              <div className={`mt-0.5 truncate text-sm font-medium ${t.strong}`} style={body}>
                {name}
              </div>
            )}
            <div className={`truncate text-sm ${name ? t.muted : `mt-0.5 ${t.strong}`}`} style={body}>
              {email}
            </div>
          </div>
          <div className={`my-1 h-px ${t.divider}`} />
          <Link to="/inventory" className={row} style={body}>
            <Boxes className="h-4 w-4" />
            Instrument inventory
          </Link>
          <Link to="/kanban" className={row} style={body}>
            <SquareKanban className="h-4 w-4" />
            Kanban
          </Link>
          {AI_ASSISTANT_ENABLED && (
            <Link to="/ai/knowledge" className={row} style={body}>
              <BookOpen className="h-4 w-4" />
              Knowledge base
            </Link>
          )}
          <Link to="/account" className={row} style={body}>
            <Settings className="h-4 w-4" />
            Profile &amp; settings
          </Link>
          {isAdmin && (
            <a href="/account#members" className={row} style={body}>
              <Users className="h-4 w-4" />
              Lab members
            </a>
          )}
          <button type="button" onClick={onSignOut} className={row} style={body}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// Primary header CTA: mint button, uppercase label, arrow nudging on hover.
function ContactButton({ onClick, full = false }: { onClick?: () => void; full?: boolean }) {
  return (
    <Link
      to="/contact-us"
      onClick={onClick}
      className={`group h-10 px-4 rounded-lg bg-[#45DFB1] text-[#0B2A22] ${NAV_TEXT} inline-flex items-center gap-2 hover:bg-[#80ED99] transition-colors ${
        full ? "w-full justify-center h-11" : ""
      }`}
      style={body}
    >
      Contact us
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// Floating bar on every page, its theme following the backdrop under it.
// `overlay` (landing) is fixed over the hero; elsewhere it is sticky in flow.
export default function SiteHeader({
  overlay = false,
  subnav,
}: {
  overlay?: boolean;
  /** Section navigation attached under the bar, in the bar's theme. */
  subnav?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isConfigured, signOut, account } = useAuth();
  const barRef = useRef<HTMLDivElement | null>(null);
  const theme = useBackdropTheme(barRef, overlay ? "dark" : "light");
  const t = THEMES[theme];
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // When auth is disabled (no Supabase env) the AI link is public; when
  // enabled, it appears only for signed-in research assistants.
  const showAi = AI_ASSISTANT_ENABLED && (!isConfigured || !!user);
  const signedIn = isConfigured && !!user;
  const mobileLinks: NavLink[] = [
    ...leadLinks,
    ...(showAi ? [AI_LINK] : []),
    ...mediaLinks,
    ...tailLinks,
    ...(EXHIBITION_LIVE ? [eventLink] : []),
  ];

  const navItems = [
    ...leadLinks.map((link) => <DesktopNavLink key={link.to} link={link} t={t} />),
    ...(showAi ? [<DesktopNavLink key="ai" link={AI_LINK} t={t} />] : []),
    <MediaDropdown key="media" t={t} pathname={pathname} />,
    ...tailLinks.map((link) => <DesktopNavLink key={link.to} link={link} t={t} />),
    ...(EXHIBITION_LIVE ? [<DesktopNavLink key="event" link={eventLink} t={t} />] : []),
  ];

  return (
    <header
      className={`${overlay ? "fixed inset-x-0" : "sticky"} top-0 z-50 px-3 md:px-4 pt-3`}
    >
      <div
        ref={barRef}
        className={`max-w-[1360px] mx-auto h-16 pl-5 pr-3 md:pl-6 rounded-xl border backdrop-blur-lg flex items-center justify-between relative z-10 transition-colors duration-300 ${t.bar}`}
      >
        <Link to="/" aria-label="smartagri home">
          <img src={t.logo} alt="smartagri" className="h-7 w-auto" />
        </Link>

        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 xl:gap-8">
          {navItems.flatMap((item, i) =>
            i === 0 ? [item] : [<Separator key={`sep-${i}`} t={t} />, item],
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ContactButton />
          {signedIn && user && (
            <AccountMenu
              email={user.email ?? ""}
              name={account?.name ?? ""}
              avatarUrl={account?.avatarUrl ?? null}
              isAdmin={!!account?.isAdmin}
              onSignOut={() => void signOut()}
              t={t}
            />
          )}
        </div>

        <div className="lg:hidden">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className={`w-11 h-11 rounded-lg flex items-center justify-center ${t.toggle}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute top-full right-0 mt-2 w-64 border rounded-xl p-3 flex flex-col gap-1 shadow-xl ${t.panel}`}
              >
                {mobileLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-3 py-2 ${NAV_TEXT} ${
                      link.highlight
                        ? "inline-flex items-center gap-1.5 text-[#45DFB1]"
                        : `transition-colors ${t.item}`
                    }`}
                    style={body}
                  >
                    {link.label}
                    {link.highlight && <LiveDot />}
                  </Link>
                ))}
                {signedIn && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className={`rounded-lg px-3 py-2 text-left ${NAV_TEXT} transition-colors ${t.item}`}
                    style={body}
                  >
                    Sign out
                  </button>
                )}
                <div className="pt-2">
                  <ContactButton full onClick={() => setMenuOpen(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {subnav && (
        <HeaderThemeContext.Provider value={theme}>
          <div className="max-w-[1360px] mx-auto">{subnav}</div>
        </HeaderThemeContext.Provider>
      )}
    </header>
  );
}
