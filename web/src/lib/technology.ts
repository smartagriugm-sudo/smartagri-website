import {
  Activity,
  BrainCircuit,
  Camera,
  CloudSun,
  Droplets,
  Eye,
  LayoutDashboard,
  Map as MapIcon,
  Plane,
  RadioTower,
  Rainbow,
  ThermometerSun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Technology = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Map ring: 1 = inner (data & intelligence), 2 = outer (sensing & actuation) */
  ring: 1 | 2;
  /** One-line bold summary shown at the top of the detail panel */
  tagline: string;
  description: string;
  benefits: string[];
  applications: string[];
  /** ids of interconnected technologies (drawn as animated links) */
  related: string[];
  /** labels of research areas (lib/research.ts) this technology powers */
  areas: string[];
};

// The center's core technology stack. TODO: have the team review the copy.
export const TECHNOLOGIES: Technology[] = [
  {
    id: "iot",
    label: "IoT Sensor Networks",
    icon: RadioTower,
    ring: 2,
    tagline:
      "Low-cost, low-power sensors that stream live field data, hour by hour.",
    description:
      "Soil moisture probes, weather stations, and water-level sensors connected over LoRa and cellular backhaul. Built to survive real field conditions on smallholder budgets, they form the data backbone of every smartagri system.",
    benefits: [
      "Continuous, real-time field monitoring",
      "Affordable open hardware",
      "Months of battery life in the field",
    ],
    applications: ["Soil monitoring", "Microclimate stations", "Water management"],
    related: ["irrigation", "climate-control", "eis", "dss", "weather"],
    areas: [
      "Open Field Technology",
      "Modernization Irrigation",
      "Indoor Farming Technology",
    ],
  },
  {
    id: "uav",
    label: "UAV Platforms",
    icon: Plane,
    ring: 2,
    tagline: "Drones that map, scout, and treat fields from above.",
    description:
      "Fixed-wing and VTOL platforms flying programmed missions over fields and estates. A twenty-minute flight produces imagery that would take days to gather on foot — the eyes of our precision agriculture work.",
    benefits: [
      "Whole-field coverage in minutes",
      "Centimeter-scale imagery",
      "Repeatable, programmed missions",
    ],
    applications: ["Field mapping", "Crop scouting", "Precision spraying"],
    related: ["multispectral", "geospatial", "vision"],
    areas: [
      "Smart UAV Technology",
      "Smart Estate Technology",
      "Open Field Technology",
    ],
  },
  {
    id: "multispectral",
    label: "Multispectral Imaging",
    icon: Camera,
    ring: 2,
    tagline: "Seeing crop stress days before the human eye can.",
    description:
      "Cameras that capture near-infrared and red-edge bands alongside visible light. Healthy vegetation reflects these bands strongly, so stress, disease, and nutrient problems show up in the data long before symptoms are visible.",
    benefits: [
      "Early stress detection",
      "Objective vegetation indices (NDVI, NDRE)",
      "Per-plot health mapping",
    ],
    applications: ["Plant health maps", "Yield estimation", "Variable-rate input"],
    related: ["uav", "ml", "geospatial", "vision"],
    areas: [
      "Smart UAV Technology",
      "Open Field Technology",
      "Smart Estate Technology",
    ],
  },
  {
    id: "hyperspectral",
    label: "Hyperspectral Sensing",
    icon: Rainbow,
    ring: 2,
    tagline: "Hundreds of spectral bands for lab-grade plant analysis.",
    description:
      "Where multispectral sees a handful of bands, hyperspectral sees hundreds — enough to estimate chlorophyll, nutrient status, and physiological responses non-destructively, from plant factories to field samples.",
    benefits: [
      "Non-destructive measurement",
      "Fine-grained physiological insight",
      "Pairs naturally with machine learning",
    ],
    applications: ["Microgreens monitoring", "Nutrient estimation", "Quality grading"],
    related: ["ml", "climate-control", "eis"],
    areas: ["Indoor Farming Technology", "Agro-Informatics"],
  },
  {
    id: "vision",
    label: "Computer Vision",
    icon: Eye,
    ring: 1,
    tagline: "Models that read leaves, count fruit, and flag disease.",
    description:
      "Deep-learning vision models trained on field imagery to detect blight, rust, and pest damage, count plants and fruit, and grade produce — turning ordinary cameras into expert scouts that never tire.",
    benefits: [
      "Early disease detection",
      "Consistent, objective assessment",
      "Runs on affordable edge devices",
    ],
    applications: ["Disease detection", "Fruit counting", "Produce grading"],
    related: ["ml", "uav", "multispectral"],
    areas: [
      "Open Field Technology",
      "Indoor Farming Technology",
      "Agro-Informatics",
    ],
  },
  {
    id: "ml",
    label: "Machine Learning & AI",
    icon: BrainCircuit,
    ring: 1,
    tagline: "Turning seasons of field data into predictions farmers can act on.",
    description:
      "From yield forecasting to irrigation scheduling, machine-learning models sit at the heart of smartagri. They fuse sensor streams, imagery, and weather data into early warnings and recommendations tuned to local conditions.",
    benefits: [
      "Season-ahead yield forecasts",
      "Learns local field behavior",
      "Improves with every season of data",
    ],
    applications: ["Yield prediction", "Anomaly detection", "Recommendation engines"],
    related: ["vision", "multispectral", "hyperspectral", "weather", "dss"],
    areas: ["Agro-Informatics", "Open Field Technology", "Smart Estate Technology"],
  },
  {
    id: "eis",
    label: "EIS Plant Sensing",
    icon: Activity,
    ring: 2,
    tagline: "Reading plant physiology through electrical impedance.",
    description:
      "Electrical impedance spectroscopy passes tiny signals through plant tissue to estimate chlorophyll and physiological status without harming the plant — a smartagri research specialty published in international journals.",
    benefits: [
      "Non-destructive physiological sensing",
      "Low-cost instrumentation",
      "Complements optical methods",
    ],
    applications: ["Chlorophyll estimation", "Plant health checks", "Phenotyping"],
    related: ["iot", "hyperspectral", "ml"],
    areas: ["Indoor Farming Technology", "Agro-Informatics"],
  },
  {
    id: "climate-control",
    label: "Climate Control Systems",
    icon: ThermometerSun,
    ring: 2,
    tagline: "Closed-loop control that keeps growing environments ideal.",
    description:
      "Controllers that regulate temperature, humidity, and vapor pressure deficit (VPD) in greenhouses and plant factories. Our VPD-control research showed how tightly managed environments translate directly into growth and yield.",
    benefits: [
      "Stable optimal growing conditions",
      "Higher growth rates and yields",
      "Efficient energy and water use",
    ],
    applications: ["Plant factories", "Smart greenhouses", "VPD control"],
    related: ["iot", "hyperspectral", "irrigation", "dss"],
    areas: ["Indoor Farming Technology"],
  },
  {
    id: "irrigation",
    label: "Smart Irrigation Control",
    icon: Droplets,
    ring: 2,
    tagline: "Water delivered exactly when and where crops ask for it.",
    description:
      "Sensor-driven valves and pumps that irrigate on plant demand instead of fixed timers — from drip systems and sprinklers to modernized canal networks — cutting water use while protecting yield.",
    benefits: [
      "Major water savings",
      "Less runoff and leaching",
      "Works from drip lines to canals",
    ],
    applications: ["Automated scheduling", "Canal telemetry", "Sprinkler control"],
    related: ["iot", "weather", "dss", "climate-control"],
    areas: ["Modernization Irrigation", "Open Field Technology"],
  },
  {
    id: "geospatial",
    label: "Geospatial Analytics",
    icon: MapIcon,
    ring: 1,
    tagline: "Every measurement on the map, every decision per plot.",
    description:
      "Stitching drone orthomosaics, satellite imagery, and sensor locations into per-plot maps. Geospatial analysis turns scattered measurements into zone maps that guide scouting, treatment, and planning.",
    benefits: [
      "Per-plot management zones",
      "Field-boundary mapping",
      "Layered multi-season views",
    ],
    applications: ["Orthomosaic mapping", "Zone management", "Estate planning"],
    related: ["uav", "multispectral", "dss"],
    areas: [
      "Smart Estate Technology",
      "Smart UAV Technology",
      "Agro-Informatics",
    ],
  },
  {
    id: "weather",
    label: "Weather & Climate Modeling",
    icon: CloudSun,
    ring: 1,
    tagline: "Seasonal outlooks tuned to smallholder decisions.",
    description:
      "Downscaled forecasts and seasonal climate outlooks built with partners like BMKG, answering the questions farmers actually ask: what to plant, when to plant, and how to hedge a late monsoon.",
    benefits: [
      "Locally calibrated forecasts",
      "Season-ahead planning signals",
      "Climate-risk indicators",
    ],
    applications: ["Planting calendars", "Drought early warning", "Risk advisories"],
    related: ["ml", "irrigation", "iot", "dss"],
    areas: ["Open Field Technology", "Modernization Irrigation"],
  },
  {
    id: "dss",
    label: "Decision Support Systems",
    icon: LayoutDashboard,
    ring: 1,
    tagline: "Dashboards that end in a decision, not a dataset.",
    description:
      "The layer farmers and cooperatives actually touch: dashboards and advisories that fuse everything above into plain recommendations — which plot to scout first, when to irrigate, what to expect at harvest.",
    benefits: [
      "Plain-language recommendations",
      "Designed with farmer cooperatives",
      "Works on ordinary phones",
    ],
    applications: ["Farm dashboards", "Advisory messages", "Cooperative reporting"],
    related: ["ml", "iot", "irrigation", "weather", "geospatial", "climate-control"],
    areas: [
      "Agro-Informatics",
      "Smart Estate Technology",
      "Modernization Irrigation",
    ],
  },
];
