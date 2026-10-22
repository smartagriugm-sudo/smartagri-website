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

// Area names from the center's research program. Copy and outcomes follow the
// evidence in lib/research-evidence.ts (the center's projects and the student
// theses), so every figure quoted here can be traced to a document.
export const RESEARCH_AREAS: ResearchArea[] = [
  {
    slug: "open-field-technology",
    label: "Open Field Technology",
    icon: Sprout,
    desc: "Sensing, control and mechanisation for open fields: automatic sprinklers on coastal sand, guided tractors, pest deterrents and non-destructive crop and fruit assessment.",
    overview:
      "Open Field Technology brings precision agriculture to the fields farmers actually work. One architecture, sensors and controllers on site with cloud analysis and apps behind them, runs through our work on coastal sand irrigation, tractor guidance, bird pest control and crop and fruit assessment.",
    capabilities: [
      "IoT and weather-aware sprinkler control for coastal sandy soils",
      "GPS tracking and auto-steering for tillage",
      "Computer-vision bird pest detection and deterrence",
      "Non-destructive leaf and fruit assessment",
    ],
    outcomes: [
      "16.9% less water than farmers' own watering in a three-day sandy-soil trial",
      "Sprinkler uniformity raised from 77.9% to 92.8% by correcting pressure and layout",
      "Salak sugar content read without cutting the fruit (R² 0.946)",
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
    desc: "Modernising irrigation networks with information systems, discharge forecasting, gate automation and the knowledge of the people who run them.",
    overview:
      "Irrigation performance does not come back with rehabilitation alone. Through SIPASI and our work at DI Sapon in Kulon Progo we bring irrigation operation onto data: forecasting canal discharge, modelling how gate moves shift the water, and capturing what experienced operators know.",
    capabilities: [
      "SIPASI decision support for operation and maintenance",
      "Deep-learning forecasts of canal discharge",
      "Hydrodynamic modelling and automatic gate control",
      "Knowledge management for irrigation operators",
    ],
    outcomes: [
      "SIPASI in use in the Wadaslintang, Mrican and Way Sekampung irrigation areas",
      "Primary canal discharge forecast with R² 0.974 for cropping-pattern planning",
      "Operators' tacit gate decisions turned into a shareable dashboard",
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
    desc: "Precision management for oil palm estates: fertiliser decision support, soil moisture monitoring, rapid fertiliser checks and AI stress prediction.",
    overview:
      "On a plantation, a small error in fertiliser or water repeats across thousands of palms. Our estate work turns historical records, field sensors and aerial imagery into decisions on what to apply, where, and when stress is on its way.",
    capabilities: [
      "Fertiliser dose models from historical estate data",
      "Real-time soil moisture on suboptimal soils",
      "AI-based rapid testing for off-spec fertiliser",
      "Environmental stress prediction from multispectral VTOL imagery",
    ],
    outcomes: [
      "Fertiliser recommendations for six nutrients from the estate's own records",
      "A water deficit seen before it shows in the palms",
      "Fertiliser checked against its specification before it is spread",
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
    desc: "VTOL drones with RGB and multispectral cameras and machine learning for tree counting, crop health, plant physiology and fertiliser zoning.",
    overview:
      "Our UAV work has moved from pictures to physiology. Trinity Pro VTOL flights with multispectral cameras, matched to measurements on the ground, become maps of tree counts, crop health, stomatal conductance and where fertiliser is needed.",
    capabilities: [
      "Automated tree counting from VTOL orthomosaics",
      "Crop health and physiology mapping from multispectral imagery",
      "Land management assessment per plot",
      "Grid zoning for variable-rate fertilising",
    ],
    outcomes: [
      "Rice stomatal conductance mapped from the air (R² 0.69)",
      "93 paddy plots rated for land management (F1 0.79)",
      "Fertiliser-need maps ready for variable-rate application",
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
    desc: "Smart greenhouses and plant factories, and sensing the plant itself: gas exchange, impedance, spectroscopy and electrical signals.",
    overview:
      "Indoor farming is our most active area. It starts with the growing environment, VPD-based greenhouse control, edge computing, lighting and aeroponics, and is moving towards reading the plant directly through its gas exchange, impedance, spectrum and electrical signals.",
    capabilities: [
      "VPD-based climate monitoring and control",
      "Plant factory and aeroponic production systems",
      "Plant-based sensing: impedance, low-cost spectroscopy, electrical signals",
      "Machine learning and computer vision for physiology and disorders",
    ],
    outcomes: [
      "Lettuce photosynthesis predicted from monitoring data (R² 0.985)",
      "A low-cost spectral sensor matched to a reference spectrometer (R² up to 0.974)",
      "A low-cost smart greenhouse running with the Taruna Tani farmer group in Sriharjo",
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
    desc: "Information systems, knowledge management and data technology for agribusiness: ERP, blockchain traceability and IoT early warning.",
    overview:
      "Agro-Informatics connects the rest of our work to the people who use it: enterprise and knowledge systems for cooperatives and communities, an ERP for the plant factory, blockchain traceability for rice and IoT early warning for village industry.",
    capabilities: [
      "Enterprise and decision support systems for cooperatives",
      "Knowledge management systems",
      "Blockchain traceability for supply chains",
      "IoT early-warning and monitoring dashboards",
    ],
    outcomes: [
      "Rice traced from farmer to consumer on a blockchain (SUS 87.8, A+)",
      "Plant factory operations run from one ERP",
      "An air quality early warning for village tofu makers",
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

// Words that tie field notes and publications to an area, matched (case
// insensitive) against titles and excerpts on the area's page ("in practice").
// English and Indonesian, since the archive holds both.
export const RESEARCH_KEYWORDS: Record<string, string[]> = {
  "open-field-technology": ["open field", "paddy", "rice field", "sawah", "padi", "rainfed", "lahan kering", "soil moisture", "lengas tanah", "shallot"],
  "irrigation-modernization": ["irrigation", "irigasi", "sipasi", "water management", "alternate wetting", "canal", "saluran", "fertigation", "fertigasi"],
  "smart-estate-technology": ["estate", "plantation", "perkebunan", "oil palm", "kelapa sawit", "sawit", "sugarcane", "tebu"],
  "smart-uav-technology": ["uav", "drone", "vtol", "multispectral", "multispektral", "aerial", "unmanned"],
  "indoor-farming-technology": ["indoor", "plant factory", "greenhouse", "hydroponic", "hidroponik", "vertical farm", "microgreen", "controlled environment"],
  "agro-informatics": ["machine learning", "deep learning", "neural network", "jaringan saraf", "artificial intelligence", "decision support", "sistem pendukung keputusan", "computer vision", "dashboard", "internet of things", "iot"],
};
