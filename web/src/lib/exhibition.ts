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
import { partnerLogo } from "./assets";

// Tag used to surface event coverage (news, daily reports, after report) from
// Field Notes on the exhibition page. Articles tagged with this in /admin
// show up automatically.
export const EVENT_TAG = "INAGRITECH 2026";

// TODO: confirm exact date, venue, hall, and booth number with the committee.
export const EVENT = {
  name: "INAGRITECH 2026",
  tagline:
    "Indonesia's international exhibition for agriculture, horticulture, and plantation technology.",
  date: "TODO: e.g. 5–7 August 2026",
  venue: "TODO: JIExpo Kemayoran, Jakarta",
  booth: "TODO: Hall B, Booth A-12",
  // Optional official event website; leave empty to hide the link.
  website: "",
};

export type ShowcaseItem = {
  kind: "Product" | "Service";
  icon: LucideIcon;
  title: string;
  desc: string;
};

// What visitors can see and try at the booth. TODO: team to confirm the
// product/service line-up and copy.
export const SHOWCASE: ShowcaseItem[] = [
  {
    kind: "Product",
    icon: RadioTower,
    title: "Field Sensor Network",
    desc: "Low-cost IoT soil moisture, temperature, and weather sensors streaming live field data over LoRa and cellular.",
  },
  {
    kind: "Service",
    icon: Plane,
    title: "UAV Crop Mapping",
    desc: "Drone multispectral surveys turned into per-plot health maps for scouting, yield estimation, and precision treatment.",
  },
  {
    kind: "Product",
    icon: Warehouse,
    title: "Smart Greenhouse Controller",
    desc: "Closed-loop climate and irrigation control for greenhouses and plant factories, built on affordable open hardware.",
  },
  {
    kind: "Product",
    icon: LayoutDashboard,
    title: "Farm Decision Dashboard",
    desc: "A web and mobile dashboard that turns sensor, drone, and weather data into plain recommendations farmers can act on.",
  },
  {
    kind: "Service",
    icon: Droplets,
    title: "Irrigation Modernization",
    desc: "Telemetry, hydraulic analysis, and demand-based scheduling for canals and on-farm water networks.",
  },
  {
    kind: "Service",
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

// Sponsors and supporting organizations. TODO: confirm the real sponsor list
// for INAGRITECH 2026; logos below reuse existing partner marks as placeholders.
export const SPONSORS: Sponsor[] = [
  { name: "Pertamina Patra Niaga", logo: partnerLogo("pertamina-patra-niaga.png") },
  { name: "NVIDIA", logo: partnerLogo("nvidia.svg") },
  {
    name: "Indosat Ooredoo Hutchison",
    logo: partnerLogo("indosat-ooredoo-hutchison.png"),
  },
  { name: "Wilmar International", logo: partnerLogo("wilmar-international.png") },
  { name: "BISI International", logo: partnerLogo("bisi-international.png") },
  { name: "PUAPT UGM", logo: partnerLogo("puapt-ugm.png") },
];

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
