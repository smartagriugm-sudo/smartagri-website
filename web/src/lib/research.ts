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
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Short card description (landing carousel + cards). */
  desc: string;
  /** Longer intro shown at the top of the detail page. */
  overview: string;
  /** What we actually do in this area. */
  capabilities: string[];
  /** Real-world outcomes / why it matters. */
  outcomes: string[];
  /** Technology labels (see lib/technology.ts) this area builds on. */
  technologies: string[];
};

// Area names from the center's research program. TODO: have the team review
// the overview/capabilities/outcomes copy.
export const RESEARCH_AREAS: ResearchArea[] = [
  {
    slug: "open-field-technology",
    label: "Open Field Technology",
    icon: Sprout,
    desc: "Sensing, automation, and mechanization for open-field production, from land preparation to harvest, tuned to smallholder realities.",
    overview:
      "Open Field Technology brings precision agriculture to the staple crops most farmers actually grow. We combine field sensors, imagery, and machine learning to help farmers and cooperatives decide what to do, and when, across the whole season.",
    capabilities: [
      "Soil moisture and microclimate monitoring across plots",
      "Crop health mapping from drone and satellite imagery",
      "Disease and pest early-warning models",
      "Yield estimation and harvest planning",
    ],
    outcomes: [
      "Fewer crop losses through earlier intervention",
      "Better-timed irrigation and input use",
      "Data-backed decisions for cooperatives",
    ],
    technologies: [
      "IoT Sensor Networks",
      "Computer Vision",
      "Machine Learning & AI",
      "Weather & Climate Modeling",
    ],
  },
  {
    slug: "irrigation-modernization",
    label: "Irrigation Modernization",
    icon: Droplets,
    desc: "Modernizing irrigation systems with telemetry, smart gates, and data-driven scheduling for canals and on-farm water networks.",
    overview:
      "Water is the most contested resource in agriculture. We modernize irrigation, from primary canals down to the field, with telemetry, hydraulic analysis, and demand-based scheduling so every drop reaches the crops that need it.",
    capabilities: [
      "Canal and channel discharge monitoring and prediction",
      "Hydraulic analysis and water distribution uniformity studies",
      "Automated, sensor-driven irrigation scheduling",
      "Decision support for irrigation operators",
    ],
    outcomes: [
      "Major reductions in water use",
      "More equitable water distribution along canals",
      "Stronger resilience to dry seasons",
    ],
    technologies: [
      "Smart Irrigation Control",
      "IoT Sensor Networks",
      "Weather & Climate Modeling",
      "Decision Support Systems",
    ],
  },
  {
    slug: "smart-estate-technology",
    label: "Smart Estate Technology",
    icon: Trees,
    desc: "Digital tools for plantation estates: block-level monitoring, fleet tracking, and yield recording at estate scale.",
    overview:
      "Plantation estates operate at a scale where small inefficiencies compound quickly. We build estate-scale digital tools that turn thousands of hectares into a monitored, measurable, and manageable operation.",
    capabilities: [
      "Block-level health and productivity monitoring",
      "Aerial mapping of large estates",
      "Yield recording and harvest logistics",
      "Estate-wide data dashboards",
    ],
    outcomes: [
      "Targeted treatment instead of blanket application",
      "Clearer view of estate productivity",
      "Better planning across many blocks",
    ],
    technologies: [
      "UAV Platforms",
      "Geospatial Analytics",
      "Multispectral Imaging",
      "Decision Support Systems",
    ],
  },
  {
    slug: "smart-uav-technology",
    label: "Smart UAV Technology",
    icon: Plane,
    desc: "UAV platforms for multispectral mapping, crop scouting, and precision spraying across fields and estates.",
    overview:
      "Drones give us a view of the field that no ground survey can match. Our UAV research covers the full workflow, from flight planning and multispectral capture to stitched, per-plot maps that guide action on the ground.",
    capabilities: [
      "Fixed-wing and VTOL mission planning",
      "Multispectral and RGB image capture",
      "Orthomosaic stitching and vegetation indices",
      "Precision spraying trials",
    ],
    outcomes: [
      "Whole-field assessment in minutes",
      "Stress detected before it spreads",
      "Inputs applied only where needed",
    ],
    technologies: [
      "UAV Platforms",
      "Multispectral Imaging",
      "Geospatial Analytics",
      "Computer Vision",
    ],
  },
  {
    slug: "indoor-farming-technology",
    label: "Indoor Farming Technology",
    icon: Warehouse,
    desc: "Controlled-environment agriculture: greenhouses and plant factories with closed-loop climate, light, and nutrient control.",
    overview:
      "Indoor farming lets us grow more in less space, closer to cities, with far less water. Our research tunes the growing environment, from vapor pressure deficit to spectral light and nutrients, using affordable, open hardware.",
    capabilities: [
      "Closed-loop climate control (temperature, humidity, VPD)",
      "Plant-factory and greenhouse production systems",
      "Hyperspectral and non-destructive plant monitoring",
      "Microgreens and high-value crop trials",
    ],
    outcomes: [
      "Higher growth rates and yields",
      "Dramatic water savings",
      "Year-round, climate-independent production",
    ],
    technologies: [
      "Climate Control Systems",
      "Hyperspectral Sensing",
      "EIS Plant Sensing",
      "IoT Sensor Networks",
    ],
  },
  {
    slug: "agro-informatics",
    label: "Agro-Informatics",
    icon: Cpu,
    desc: "Data platforms, AI models, and decision-support systems that turn farm and field data into actionable insight.",
    overview:
      "Agro-Informatics is the connective tissue of smartagri. It turns the raw streams from every other research area, sensors, drones, weather, into models, dashboards, and recommendations that farmers and partners can act on.",
    capabilities: [
      "Machine-learning models for prediction and classification",
      "Data pipelines and platform engineering",
      "Farmer-facing dashboards and advisories",
      "Participatory, co-designed decision tools",
    ],
    outcomes: [
      "Raw data turned into clear decisions",
      "Models that improve every season",
      "Insight delivered on ordinary phones",
    ],
    technologies: [
      "Machine Learning & AI",
      "Decision Support Systems",
      "Geospatial Analytics",
      "Computer Vision",
    ],
  },
];

export function findResearchArea(slug: string): ResearchArea | undefined {
  return RESEARCH_AREAS.find((area) => area.slug === slug);
}
