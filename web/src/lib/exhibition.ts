import {
  Cloud,
  Cpu,
  Droplets,
  Gauge,
  LayoutDashboard,
  Leaf,
  Plane,
  RadioTower,
  Satellite,
  Smartphone,
  Sprout,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Tag used to surface event coverage (news, daily reports, after report) from
// Field Notes on the exhibition page. Articles tagged with this in /admin
// show up automatically.
export const EVENT_TAG = "INAGRITECH 2026";

export const EVENT = {
  name: "INAGRITECH 2026",
  tagline:
    "Indonesia's international exhibition for agriculture, horticulture, and plantation technology.",
  date: "28 - 30 July 2026",
  venue: "JIExpo Kemayoran, Jakarta",
  // TODO: replace with the exact hall/booth number once confirmed.
  booth: "Coming soon",
  // Optional official event website; leave empty to hide the link.
  website: "",
};

export type ShowcaseItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

// The services we offer, on show at the booth. TODO: team to confirm the
// service line-up and copy.
export const SHOWCASE: ShowcaseItem[] = [
  {
    icon: Plane,
    title: "UAV Crop Mapping & Survey",
    desc: "Drone multispectral surveys turned into per-plot health maps for scouting, yield estimation, and precision treatment.",
  },
  {
    icon: Droplets,
    title: "Irrigation Modernization",
    desc: "Telemetry, hydraulic analysis, and demand-based scheduling for canals and on-farm water networks.",
  },
  {
    icon: Warehouse,
    title: "Smart Greenhouse & Plant Factory",
    desc: "Design and setup of closed-loop climate and irrigation control for greenhouses and plant factories.",
  },
  {
    icon: RadioTower,
    title: "IoT Field Monitoring",
    desc: "Deployment of low-cost soil, climate, and weather sensor networks that stream live field data to your team.",
  },
  {
    icon: LayoutDashboard,
    title: "Farm Data Platform & Dashboards",
    desc: "Custom dashboards and data platforms that turn sensor, drone, and weather data into decisions farmers can act on.",
  },
  {
    icon: Sprout,
    title: "Agronomy & Data Advisory",
    desc: "Research-backed advisory that pairs agronomy expertise with the center's models, sensing, and analytics.",
  },
];

export type ArchitectureStage = {
  icon: LucideIcon;
  title: string;
  components: string[];
};

// The demo system architecture shown at the booth, field to farmer.
export const ARCHITECTURE: ArchitectureStage[] = [
  {
    icon: Leaf,
    title: "In the field",
    components: ["Soil & climate sensors", "Weather station", "UAV drone survey"],
  },
  {
    icon: RadioTower,
    title: "Connectivity",
    components: ["LoRa gateway", "Cellular / internet uplink", "Edge device"],
  },
  {
    icon: Cloud,
    title: "Platform & intelligence",
    components: ["Cloud data platform", "AI / ML models", "Geospatial engine"],
  },
  {
    icon: Smartphone,
    title: "For the farmer",
    components: ["Web & mobile dashboard", "Alerts & advisories", "Field reports"],
  },
];

// Quick reference icons for the architecture legend / accents.
export const ARCH_ACCENT_ICONS: LucideIcon[] = [Gauge, Satellite, Cpu];

export type Sponsor = {
  name: string;
  logo: string;
};

// Sponsors and supporting organizations.
// TODO: add sponsor logos here when confirmed, e.g.
//   { name: "Sponsor Name", logo: partnerLogo("sponsor-file.png") },
// While empty, the exhibition page shows a "coming soon" placeholder.
export const SPONSORS: Sponsor[] = [];

export type ExhibitionDoc = {
  title: string;
  desc: string;
  // Path under public/, e.g. /brand/docs/leaflet.pdf. Empty = not ready yet.
  url: string;
  // Rough file label shown on the button when available.
  meta?: string;
};

// Public documents. TODO: drop the real files in web/public/brand/docs/ and
// fill `url` (e.g. "/brand/docs/smartagri-leaflet.pdf"). Empty url renders a
// "Coming soon" state instead of a broken download.
export const DOCUMENTS: ExhibitionDoc[] = [
  {
    title: "smartagri Leaflet",
    desc: "A one-page overview of who we are and what we offer, ideal to take away from the booth.",
    url: "",
    meta: "PDF",
  },
  {
    title: "Company / Center Profile",
    desc: "The full profile of the Smart Agriculture Research Center, its programs, and its team.",
    url: "",
    meta: "PDF",
  },
  {
    title: "Product & Service Catalog",
    desc: "Detailed specifications of the products and services we showcase at INAGRITECH 2026.",
    url: "",
    meta: "PDF",
  },
];
