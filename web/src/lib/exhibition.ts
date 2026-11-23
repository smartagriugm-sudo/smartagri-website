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
import type { Lang } from "./i18n-core";

// Master switch for the annual exhibition. While false, every entry point
// (header, footer, /links guest book button) is hidden and /exhibition and
// /guestbook redirect home; /guestbook/admin stays reachable for the data.
// Flip back to true (and update EVENT below) for the next edition.
export const EXHIBITION_LIVE = false;

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
  booth: "Hall A2 · A2K4-04",
  // Floor plan PDF (Google Drive); linked from the "Find us at" card.
  floorPlan:
    "https://drive.google.com/file/d/1RLsJDF9KIufxNCFcB97uYT4JRS2gaB4J/view?usp=sharing",
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
  // "funding": financial sponsor; "in-kind": support in equipment/materials.
  kind: "funding" | "in-kind";
};

// Sponsors and supporting organizations.
// While empty, the exhibition page shows a "coming soon" placeholder.
export const SPONSORS: Sponsor[] = [
  {
    name: "Cendekia Prima Inovasi",
    logo: partnerLogo("cendekia-prima-inovasi.png"),
    kind: "funding",
  },
  {
    name: "Hidronav Tehnikatama",
    logo: partnerLogo("hidronav-tehnikatama.png"),
    kind: "funding",
  },
  {
    name: "PERTETA Yogyakarta",
    logo: partnerLogo("perteta-jogja.webp"),
    kind: "funding",
  },
  {
    name: "PUAPT UGM",
    logo: partnerLogo("puapt-ugm.png"),
    kind: "in-kind",
  },
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

// Indonesian overlays. The English constants above keep their shape; pages
// read the copy for the current language through the helpers below.
const EVENT_ID: Partial<typeof EVENT> = {
  tagline:
    "Pameran internasional Indonesia untuk teknologi pertanian, hortikultura, dan perkebunan.",
  date: "28–30 Juli 2026",
};

export function eventFor(lang: Lang): typeof EVENT {
  return lang === "id" ? { ...EVENT, ...EVENT_ID } : EVENT;
}

// Keyed by the English title.
const SHOWCASE_ID: Record<string, { title: string; desc: string }> = {
  "UAV Crop Mapping & Survey": {
    title: "Pemetaan & Survei Tanaman dengan UAV",
    desc: "Survei multispektral dengan drone yang diolah menjadi peta kesehatan tanaman per petak untuk pemantauan, estimasi hasil panen, dan perlakuan presisi.",
  },
  "Irrigation Modernization": {
    title: "Modernisasi Irigasi",
    desc: "Telemetri, analisis hidraulik, dan penjadwalan berbasis kebutuhan untuk saluran irigasi dan jaringan air di tingkat usaha tani.",
  },
  "Smart Greenhouse & Plant Factory": {
    title: "Smart Greenhouse & Plant Factory",
    desc: "Perancangan dan pemasangan kendali iklim dan irigasi tertutup (closed-loop) untuk greenhouse dan plant factory.",
  },
  "IoT Field Monitoring": {
    title: "Pemantauan Lahan Berbasis IoT",
    desc: "Pemasangan jaringan sensor tanah, iklim, dan cuaca berbiaya rendah yang mengalirkan data lahan secara langsung ke tim Anda.",
  },
  "Farm Data Platform & Dashboards": {
    title: "Platform Data Pertanian & Dashboard",
    desc: "Dashboard dan platform data khusus yang mengubah data sensor, drone, dan cuaca menjadi keputusan yang dapat langsung dijalankan petani.",
  },
  "Agronomy & Data Advisory": {
    title: "Pendampingan Agronomi & Data",
    desc: "Pendampingan berbasis riset yang memadukan keahlian agronomi dengan model, penginderaan, dan analitik milik pusat riset kami.",
  },
};

export function showcaseFor(lang: Lang): ShowcaseItem[] {
  if (lang !== "id") return SHOWCASE;
  return SHOWCASE.map((item) => ({ ...item, ...SHOWCASE_ID[item.title] }));
}

const ARCHITECTURE_ID: Record<string, { title: string; components: string[] }> = {
  "In the field": {
    title: "Di lahan",
    components: ["Sensor tanah & iklim", "Stasiun cuaca", "Survei drone UAV"],
  },
  Connectivity: {
    title: "Konektivitas",
    components: ["Gateway LoRa", "Uplink seluler / internet", "Perangkat edge"],
  },
  "Platform & intelligence": {
    title: "Platform & kecerdasan",
    components: ["Platform data cloud", "Model AI / ML", "Mesin geospasial"],
  },
  "For the farmer": {
    title: "Untuk petani",
    components: ["Dashboard web & mobile", "Peringatan & rekomendasi", "Laporan lahan"],
  },
};

export function architectureFor(lang: Lang): ArchitectureStage[] {
  if (lang !== "id") return ARCHITECTURE;
  return ARCHITECTURE.map((stage) => ({ ...stage, ...ARCHITECTURE_ID[stage.title] }));
}

const DOCUMENTS_ID: Record<string, { title: string; desc: string }> = {
  "smartagri Leaflet": {
    title: "Leaflet smartagri",
    desc: "Ringkasan satu halaman tentang siapa kami dan apa yang kami tawarkan, cocok dibawa pulang dari booth.",
  },
  "Company / Center Profile": {
    title: "Profil Pusat Riset",
    desc: "Profil lengkap Smart Agriculture Research Center, beserta program dan timnya.",
  },
  "Product & Service Catalog": {
    title: "Katalog Produk & Layanan",
    desc: "Spesifikasi rinci produk dan layanan yang kami tampilkan di INAGRITECH 2026.",
  },
};

export function documentsFor(lang: Lang): ExhibitionDoc[] {
  if (lang !== "id") return DOCUMENTS;
  return DOCUMENTS.map((doc) => ({ ...doc, ...DOCUMENTS_ID[doc.title] }));
}
