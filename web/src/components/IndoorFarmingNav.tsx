import { Link } from "@tanstack/react-router";
import { body } from "../lib/fonts";
import { IF_SECTIONS } from "../lib/indoor-farming";

// Section-level sub-navigation for /indoor-farming. Sits under the site header
// so the section reads as its own mini-site while staying on the main domain.
export default function IndoorFarmingNav() {
  const linkClass =
    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:text-[#0B6477] hover:bg-[#0B6477]/8 transition-colors";
  const activeClass = "bg-[#0B6477] text-white hover:text-white hover:bg-[#0B6477]";

  return (
    <div className="sticky top-[68px] z-30 border-b border-[#0B6477]/10 bg-white/90 backdrop-blur-md">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12">
        <nav className="flex items-center gap-1 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            to="/indoor-farming/knowledge"
            className={linkClass}
            activeProps={{ className: `${linkClass} ${activeClass}` }}
            style={body}
          >
            Knowledge
          </Link>
          <Link
            to="/contact-us"
            className={`${linkClass} ml-auto text-[#0B6477]`}
            style={body}
          >
            Contact us
          </Link>
        </nav>
      </div>
    </div>
  );
}
