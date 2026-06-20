import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { A } from "../lib/assets";
import { body } from "../lib/fonts";
import { useAuth } from "../lib/auth/auth";

type NavLink = { label: string; to: string; highlight?: boolean };

const leadLinks: NavLink[] = [
  { label: "Research", to: "/research" },
  { label: "Technology", to: "/technology" },
];
// Grouped under a "Media" dropdown on narrow desktops (see MediaDropdown).
const mediaLinks: NavLink[] = [
  { label: "Publications", to: "/publications" },
  { label: "Field Notes", to: "/field-notes" },
  { label: "Gallery", to: "/gallery" },
];
const tailLinks: NavLink[] = [{ label: "About Us", to: "/about-us" }];
// Highlighted: Exhibition is a time-bound annual event, not a permanent page.
// Kept last so it sits next to the Contact us CTA as one action cluster.
const eventLink: NavLink = {
  label: "INAGRITECH 26",
  to: "/exhibition",
  highlight: true,
};

// Shown only to signed-in research assistants (or when auth is disabled).
const AI_LINK: NavLink = { label: "AI Assistant", to: "/ai" };

// Pulsing "live event" dot shown next to highlighted (event) nav items.
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#45DFB1] opacity-75 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#45DFB1]" />
    </span>
  );
}

// A single desktop nav link (standard or highlighted event style).
function DesktopNavLink({ link }: { link: NavLink }) {
  if (link.highlight) {
    return (
      <Link
        to={link.to}
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[#45DFB1] text-base font-medium hover:text-[#80ED99] transition-colors"
        style={body}
      >
        {link.label}
        <LiveDot />
      </Link>
    );
  }
  return (
    <Link
      to={link.to}
      className="whitespace-nowrap text-white text-base opacity-90 hover:opacity-100"
      style={body}
    >
      {link.label}
    </Link>
  );
}

// On narrow desktops (lg, below xl) the media links collapse into this
// hover/focus dropdown so the bar stays uncramped; at xl+ they show inline.
function MediaDropdown({ className = "" }: { className?: string }) {
  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-white text-base opacity-90 hover:opacity-100"
        style={body}
        aria-haspopup="true"
      >
        Media
        <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
      </button>
      <div className="absolute left-0 top-full pt-3 z-50 opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0">
        <div className="min-w-[190px] rounded-2xl bg-[#08313A] border border-white/10 shadow-xl p-2 flex flex-col">
          {mediaLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-base text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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

// Compact signed-in account control: an avatar (first initial of the email)
// that reveals the email + Sign out on hover/focus. Replaces the wide "Sign
// out" text link so the bar stays uncramped when the AI Assistant link shows.
function AccountMenu({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const initial = (email.trim()[0] || "?").toUpperCase();
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#45DFB1] text-[#0B2A22] text-sm font-semibold transition-colors hover:bg-[#80ED99]"
        style={body}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        {initial}
      </button>
      <div className="absolute right-0 top-full pt-3 z-50 opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0">
        <div className="min-w-[220px] rounded-2xl bg-[#08313A] border border-white/10 shadow-xl p-2">
          <div className="px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40" style={body}>
              Signed in as
            </div>
            <div className="mt-0.5 truncate text-sm text-white/90" style={body}>
              {email}
            </div>
          </div>
          <div className="my-1 h-px bg-white/10" />
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            style={body}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// Sticky on every page. `overlay` (landing) starts transparent over the hero
// video and turns solid once the page is scrolled.
export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isConfigured, signOut } = useAuth();

  // When auth is disabled (no Supabase env) the AI link is public; when
  // enabled, it appears only for signed-in research assistants.
  const showAi = !isConfigured || !!user;
  const signedIn = isConfigured && !!user;
  const mobileLinks: NavLink[] = [
    ...leadLinks,
    ...(showAi ? [AI_LINK] : []),
    ...mediaLinks,
    ...tailLinks,
    eventLink,
  ];

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const shell = overlay
    ? scrolled
      ? "fixed top-0 inset-x-0 bg-[#08313A]/85 backdrop-blur-lg shadow-lg"
      : "fixed top-0 inset-x-0 bg-transparent"
    : "sticky top-0 bg-[#08313A] shadow-lg";

  return (
    <header className={`${shell} z-50 text-white transition-colors duration-300`}>
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 h-[76px] flex items-center justify-between relative">
        <Link to="/" aria-label="smartagri home">
          <img src={A.logoWhite} alt="smartagri" className="h-8 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
          {leadLinks.map((link) => (
            <DesktopNavLink key={link.to} link={link} />
          ))}
          {showAi && <DesktopNavLink link={AI_LINK} />}
          {/* Publications, Field Notes, and Gallery always live under this
              "Media" dropdown to keep the bar compact. */}
          <MediaDropdown />
          {tailLinks.map((link) => (
            <DesktopNavLink key={link.to} link={link} />
          ))}
          <DesktopNavLink link={eventLink} />
          <Link
            to="/contact-us"
            className="h-10 px-5 rounded-full bg-[#45DFB1] text-[#0B2A22] font-medium flex items-center whitespace-nowrap hover:bg-[#80ED99] transition-colors"
            style={body}
          >
            Contact us
          </Link>
          {signedIn && user && (
            <AccountMenu
              email={user.email ?? ""}
              onSignOut={() => void signOut()}
            />
          )}
        </nav>

        <div className="lg:hidden">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="w-11 h-11 rounded-full bg-[#08313A]/45 backdrop-blur-lg flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-6 mt-2 w-60 bg-[#08313A]/95 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
              >
                {mobileLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={
                      link.highlight
                        ? "inline-flex items-center gap-1.5 text-[#45DFB1] text-base font-medium"
                        : "text-white text-base opacity-90 hover:opacity-100"
                    }
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
                    className="text-left text-white/80 text-base hover:text-white"
                    style={body}
                  >
                    Sign out
                  </button>
                )}
                <Link
                  to="/contact-us"
                  onClick={() => setMenuOpen(false)}
                  className="h-11 rounded-full bg-[#45DFB1] text-[#0B2A22] font-medium flex items-center justify-center"
                  style={body}
                >
                  Contact us
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
