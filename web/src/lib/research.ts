import {
  Cpu,
  Droplets,
  Plane,
  Sprout,
  Trees,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ResearchArea = {
  label: string;
  icon: LucideIcon;
  desc: string;
};

// Area names from the center's research program. Descriptions are drafted —
// TODO: have the team review/replace the desc copy.
export const RESEARCH_AREAS: ResearchArea[] = [
  {
    label: "Open Field Technology",
    icon: Sprout,
    desc: "Sensing, automation, and mechanization for open-field production — from land preparation to harvest — tuned to smallholder realities.",
  },
  {
    label: "Modernization Irrigation",
    icon: Droplets,
    desc: "Modernizing irrigation systems with telemetry, smart gates, and data-driven scheduling for canals and on-farm water networks.",
  },
  {
    label: "Smart Estate Technology",
    icon: Trees,
    desc: "Digital tools for plantation estates: block-level monitoring, fleet tracking, and yield recording at estate scale.",
  },
  {
    label: "Smart UAV Technology",
    icon: Plane,
    desc: "UAV platforms for multispectral mapping, crop scouting, and precision spraying across fields and estates.",
  },
  {
    label: "Indoor Farming Technology",
    icon: Warehouse,
    desc: "Controlled-environment agriculture — greenhouses and plant factories with closed-loop climate, light, and nutrient control.",
  },
  {
    label: "Agro-Informatics",
    icon: Cpu,
    desc: "Data platforms, AI models, and decision-support systems that turn farm and field data into actionable insight.",
  },
];
