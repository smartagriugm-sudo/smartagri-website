import { Link } from "@tanstack/react-router";
import { useAuth } from "../lib/auth/auth";
import { body } from "../lib/fonts";
import { IF_SECTIONS } from "../lib/indoor-farming";

// Section navigation for /indoor-farming.
//
// Deliberately styled as a dark brand bar rather than a second white header:
// the section name sits on the left so the bar reads as "you are inside Indoor
// Farming" instead of repeating the site navigation above it.
export default function IndoorFarmingNav() {
  // The dashboard is an internal demo tool. Hide the link the same way the
  // site header hides "AI Assistant": visible when auth is switched off, and
  // otherwise only once signed in. The route itself is what enforces access;
  // this is only so visitors are not shown a door they cannot open.
  const { user, isConfigured } = useAuth();
  const showDashboard = !isConfigured || !!user;

  const linkClass =
    "whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors";
  const activeClass =
    "bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99] hover:text-[#0B2A22]";

  return (
    <div className="sticky top-[68px] z-30 bg-[#08313A]">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12">
        <div className="flex items-center gap-3 h-11">
          <Link
            to="/indoor-farming"
            className="hidden sm:flex items-center gap-2 shrink-0 text-[13px] font-semibold tracking-[-0.01em] text-[#45DFB1] hover:text-[#80ED99] transition-colors"
            style={body}
          >
            Indoor Farming
          </Link>
          <span className="hidden sm:block h-4 w-px shrink-0 bg-white/15" />

          <nav className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              to="/indoor-farming"
              activeOptions={{ exact: true }}
              className={linkClass}
              activeProps={{ className: `${linkClass} ${activeClass}` }}
              style={body}
            >
              Overview
            </Link>
            {IF_SECTIONS.map((section) => (
              <Link
                key={section.slug}
                to="/indoor-farming/$section"
                params={{ section: section.slug }}
                className={linkClass}
                activeProps={{ className: `${linkClass} ${activeClass}` }}
                style={body}
              >
                {section.label}
              </Link>
            ))}
            <Link
              to="/indoor-farming/instrumentation"
              className={linkClass}
              activeProps={{ className: `${linkClass} ${activeClass}` }}
              style={body}
            >
              Instrumentation
            </Link>
            {showDashboard && (
              <Link
                to="/indoor-farming/dashboard"
                className={linkClass}
                activeProps={{ className: `${linkClass} ${activeClass}` }}
                style={body}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/indoor-farming/knowledge"
              className={linkClass}
              activeProps={{ className: `${linkClass} ${activeClass}` }}
              style={body}
            >
              Knowledge
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
