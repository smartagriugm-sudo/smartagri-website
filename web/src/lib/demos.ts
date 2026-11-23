import { Droplets, Plane, RadioTower, Sprout, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { localize, localizeAll, type Lang } from "./i18n-core";

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
    desc: "Canal telemetry and demand-based scheduling, from water-level and discharge readings through the allocation policy to gate actions across primary, secondary, and tertiary networks.",
    src: "/demos/irrigation-modernization.html",
    height: 760,
  },
  {
    slug: "uav-crop-mapping",
    title: "UAV Crop Mapping",
    icon: Plane,
    desc: "The drone-to-map pipeline: flight plan, multispectral capture, stitching, and per-plot health maps.",
    src: "/demos/uav-crop-mapping.html",
    height: 760,
  },
  {
    slug: "iot-field-monitoring",
    title: "IoT Field Monitoring",
    icon: RadioTower,
    desc: "Sensor network data flowing from the field through the edge node, gateway, and cloud, validated and evaluated into live dashboards and alerts.",
    src: "/demos/iot-field-monitoring.html",
    height: 760,
  },
  {
    slug: "open-field-advisory",
    title: "Open Field Advisory",
    icon: Sprout,
    desc: "How field, weather, satellite, and crop-model data combine into planting, irrigation, fertilization, and treatment recommendations for the farmer.",
    src: "/demos/open-field-advisory.html",
    height: 760,
  },
];

export function findDemo(slug: string): WorkflowDemo | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}

// Indonesian overlay, keyed by slug. Only display copy; slugs, icons, and
// embed paths stay as in DEMOS.
const DEMOS_ID: Record<string, Partial<WorkflowDemo>> = {
  "smart-greenhouse": {
    title: "Smart Greenhouse",
    desc: "Cara agen greenhouse membaca sensor, mengambil keputusan, lalu mengendalikan pendinginan, pemanasan, pencahayaan, CO₂, dan fertigasi dalam delapan skenario nyata.",
  },
  "irrigation-modernization": {
    title: "Modernisasi Irigasi",
    desc: "Telemetri saluran dan penjadwalan berbasis kebutuhan air, dari pembacaan tinggi muka air dan debit, melalui kebijakan alokasi, hingga pengoperasian pintu air di jaringan primer, sekunder, dan tersier.",
  },
  "uav-crop-mapping": {
    title: "Pemetaan Tanaman dengan UAV",
    desc: "Alur dari drone hingga peta: rencana terbang, akuisisi citra multispektral, penggabungan citra (stitching), dan peta kesehatan tanaman per petak.",
  },
  "iot-field-monitoring": {
    title: "Pemantauan Lahan berbasis IoT",
    desc: "Data jaringan sensor mengalir dari lahan melalui edge node, gateway, dan cloud, lalu divalidasi dan dievaluasi menjadi dashboard dan peringatan secara langsung.",
  },
  "open-field-advisory": {
    title: "Rekomendasi Budidaya Lahan Terbuka",
    desc: "Cara data lahan, cuaca, satelit, dan model tanaman dipadukan menjadi rekomendasi tanam, irigasi, pemupukan, dan penanganan tanaman bagi petani.",
  },
};

export function demosFor(lang: Lang): WorkflowDemo[] {
  return localizeAll(DEMOS, DEMOS_ID, (demo) => demo.slug, lang);
}

export function findDemoFor(slug: string, lang: Lang): WorkflowDemo | undefined {
  const demo = findDemo(slug);
  return demo && localize(demo, DEMOS_ID[demo.slug], lang);
}
