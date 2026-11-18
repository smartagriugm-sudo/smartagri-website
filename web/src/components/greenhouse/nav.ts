import { Activity, Gauge, Power, Radio, Settings2, type LucideIcon } from "lucide-react";

// The Greenhouse dashboard (agrosphere /greenhouse): measured data from each field
// site's edge PC. It has its own sections, separate from the Indoor demo's screens.

export const FIELD_BASE = "/indoor-farming/dashboard/field";

export type GreenhouseNavItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  /** One line describing the section, used as its page lede. */
  blurb: string;
  /** Only lab admins see this section (the RPCs behind it refuse anyone else). */
  adminOnly?: boolean;
};

export const GREENHOUSE_NAV: GreenhouseNavItem[] = [
  {
    label: "Overview",
    icon: Gauge,
    to: FIELD_BASE,
    blurb: "The selected site right now: whether it is reporting, its latest conditions, and anything that needs a look.",
  },
  {
    label: "Sensors",
    icon: Radio,
    to: `${FIELD_BASE}/sensors`,
    blurb: "Every device at the site with its latest 10-minute averages. Pick a reading to see how it has moved.",
  },
  {
    label: "Trends",
    icon: Activity,
    to: `${FIELD_BASE}/trends`,
    blurb: "Any measured value over the last day, week, or month.",
  },
  {
    label: "Actuators",
    icon: Power,
    to: `${FIELD_BASE}/actuators`,
    blurb: "Fans, pumps, and other relays as the edge PC last saw them. Read only.",
  },
  {
    label: "Manage sites",
    icon: Settings2,
    to: `${FIELD_BASE}/manage`,
    blurb: "Register sites, give each edge PC its token, and choose which accounts may read each site.",
    adminOnly: true,
  },
];

export function isGreenhousePath(path: string): boolean {
  return path === FIELD_BASE || path.startsWith(`${FIELD_BASE}/`);
}

/** The section a path belongs to (Overview when nothing more specific matches). */
export function greenhouseSection(path: string): GreenhouseNavItem {
  const clean = path.replace(/\/$/, "");
  return GREENHOUSE_NAV.find((n) => n.to !== FIELD_BASE && (clean === n.to || clean.startsWith(`${n.to}/`))) ?? GREENHOUSE_NAV[0];
}
