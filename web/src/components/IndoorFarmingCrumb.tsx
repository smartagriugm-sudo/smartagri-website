import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { body } from "../lib/fonts";

// Lightweight trail for the Indoor Farming pages. Replaces a second navigation
// bar: it shows where you are and how to get back up without repeating the
// site header.
export default function IndoorFarmingCrumb({
  section,
  current,
}: {
  /** Optional middle step: the section this page belongs to. */
  section?: { slug: string; label: string };
  /** Label for the page you are on. Omit on the Indoor Farming landing page. */
  current?: string;
}) {
  const linkClass =
    "text-neutral-400 hover:text-[#0B6477] transition-colors whitespace-nowrap";

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={body}
    >
      <Link to="/research" className={linkClass}>
        Research
      </Link>
      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-300" />
      {current || section ? (
        <Link to="/indoor-farming" className={linkClass}>
          Indoor Farming
        </Link>
      ) : (
        <span className="font-medium text-neutral-700 whitespace-nowrap">
          Indoor Farming
        </span>
      )}
      {section && (
        <>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-300" />
          <Link
            to="/indoor-farming/$section"
            params={{ section: section.slug }}
            className={linkClass}
          >
            {section.label}
          </Link>
        </>
      )}
      {current && (
        <>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-300" />
          <span className="font-medium text-neutral-700 whitespace-nowrap">
            {current}
          </span>
        </>
      )}
    </nav>
  );
}
