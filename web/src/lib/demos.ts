import { Droplets, Plane, RadioTower, Sprout, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkflowDemo = {
  slug: string;
  title: string;
  icon: LucideIcon;
  desc: string;
  // Path to a self-contained workflow HTML under public/. When set, the demo
  // renders as an interactive embed; otherwise it shows a "coming soon" card.
  src?: string;
  // Suggested embed height in px.
  height?: number;
};

// Interactive workflow simulations of each smartagri system. Drop a new
// self-contained HTML into public/demos/ and add an entry with its `src`.
export const DEMOS: WorkflowDemo[] = [
  {
    slug: "smart-greenhouse",
    title: "Smart Greenhouse",
    icon: Warehouse,
    desc: "How the greenhouse agent reads sensors, decides, and drives cooling, heating, lighting, CO₂, and fertigation across eight real scenarios.",
    src: "/demos/greenhouse-workflow.html",
    height: 760,
  },
  {
    slug: "irrigation-modernization",
    title: "Irrigation Modernization",
    icon: Droplets,
    desc: "Canal telemetry and demand-based scheduling, from water-level readings to gate and pump actions.",
  },
  {
    slug: "uav-crop-mapping",
    title: "UAV Crop Mapping",
    icon: Plane,
    desc: "The drone-to-map pipeline: flight plan, multispectral capture, stitching, and per-plot health maps.",
  },
  {
    slug: "iot-field-monitoring",
    title: "IoT Field Monitoring",
    icon: RadioTower,
    desc: "Sensor network data flowing from the field through the gateway to live dashboards and alerts.",
  },
  {
    slug: "open-field-advisory",
    title: "Open Field Advisory",
    icon: Sprout,
    desc: "How field, weather, and model data combine into planting, irrigation, and treatment recommendations.",
  },
];

export function findDemo(slug: string): WorkflowDemo | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}
