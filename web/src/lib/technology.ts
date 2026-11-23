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
import { localizeAll, type Lang } from "./i18n-core";

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
      "Irrigation Modernization",
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
      "Fixed-wing and VTOL platforms flying programmed missions over fields and estates. A twenty-minute flight produces imagery that would take days to gather on foot. They are the eyes of our precision agriculture work.",
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
      "Where multispectral sees a handful of bands, hyperspectral sees hundreds, enough to estimate chlorophyll, nutrient status, and physiological responses non-destructively, from plant factories to field samples.",
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
      "Deep-learning vision models trained on field imagery to detect blight, rust, and pest damage, count plants and fruit, and grade produce, turning ordinary cameras into expert scouts that never tire.",
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
      "Electrical impedance spectroscopy passes tiny signals through plant tissue to estimate chlorophyll and physiological status without harming the plant, a smartagri research specialty published in international journals.",
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
      "Sensor-driven valves and pumps that irrigate on plant demand instead of fixed timers (from drip systems and sprinklers to modernized canal networks), cutting water use while protecting yield.",
    benefits: [
      "Major water savings",
      "Less runoff and leaching",
      "Works from drip lines to canals",
    ],
    applications: ["Automated scheduling", "Canal telemetry", "Sprinkler control"],
    related: ["iot", "weather", "dss", "climate-control"],
    areas: ["Irrigation Modernization", "Open Field Technology"],
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
    areas: ["Open Field Technology", "Irrigation Modernization"],
  },
  {
    id: "dss",
    label: "Decision Support Systems",
    icon: LayoutDashboard,
    ring: 1,
    tagline: "Dashboards that end in a decision, not a dataset.",
    description:
      "The layer farmers and cooperatives actually touch: dashboards and advisories that fuse everything above into plain recommendations: which plot to scout first, when to irrigate, what to expect at harvest.",
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
      "Irrigation Modernization",
    ],
  },
];

// ---- Bahasa Indonesia (see lib/i18n.tsx) ----
// Indonesian copy per technology id. Keep `related` and `areas` untouched (keys).
const TECHNOLOGIES_ID: Record<string, Partial<Technology>> = {
  iot: {
    label: "Jaringan Sensor IoT",
    tagline: "Sensor murah dan hemat daya yang mengalirkan data lapangan secara langsung, jam demi jam.",
    description:
      "Probe lengas tanah, stasiun cuaca, dan sensor muka air yang terhubung lewat LoRa dan jaringan seluler. Dirancang tahan terhadap kondisi lapangan dengan biaya yang terjangkau petani kecil, sensor ini menjadi tulang punggung data setiap sistem smartagri.",
    benefits: [
      "Pemantauan lapangan berkelanjutan secara real-time",
      "Perangkat keras terbuka yang terjangkau",
      "Daya baterai berbulan-bulan di lapangan",
    ],
    applications: ["Pemantauan tanah", "Stasiun iklim mikro", "Pengelolaan air"],
  },
  uav: {
    label: "Platform UAV",
    tagline: "Drone yang memetakan, memantau, dan merawat lahan dari udara.",
    description:
      "Wahana fixed-wing dan VTOL yang menjalankan misi terprogram di atas lahan dan perkebunan. Penerbangan dua puluh menit menghasilkan citra yang butuh berhari-hari bila dikumpulkan dengan berjalan kaki. Inilah mata bagi riset pertanian presisi kami.",
    benefits: [
      "Cakupan seluruh lahan dalam hitungan menit",
      "Citra beresolusi skala sentimeter",
      "Misi terprogram yang dapat diulang",
    ],
    applications: ["Pemetaan lahan", "Pemantauan tanaman", "Penyemprotan presisi"],
  },
  multispectral: {
    label: "Pencitraan Multispektral",
    tagline: "Melihat cekaman tanaman berhari-hari sebelum tampak oleh mata manusia.",
    description:
      "Kamera yang merekam kanal inframerah dekat dan red-edge di samping cahaya tampak. Vegetasi sehat memantulkan kanal ini dengan kuat, sehingga cekaman, penyakit, dan masalah hara terlihat pada data jauh sebelum gejalanya tampak.",
    benefits: [
      "Deteksi dini cekaman",
      "Indeks vegetasi yang objektif (NDVI, NDRE)",
      "Peta kesehatan per petak",
    ],
    applications: ["Peta kesehatan tanaman", "Estimasi hasil panen", "Input variable-rate"],
  },
  hyperspectral: {
    label: "Penginderaan Hyperspectral",
    tagline: "Ratusan kanal spektral untuk analisis tanaman setara laboratorium.",
    description:
      "Bila multispektral melihat segelintir kanal, hyperspectral melihat ratusan, cukup untuk mengestimasi klorofil, status hara, dan respons fisiologis tanpa merusak tanaman, dari plant factory hingga sampel lapangan.",
    benefits: [
      "Pengukuran tanpa merusak",
      "Wawasan fisiologis yang rinci",
      "Berpadu alami dengan machine learning",
    ],
    applications: ["Pemantauan microgreens", "Estimasi hara", "Penentuan mutu"],
  },
  vision: {
    label: "Computer Vision",
    tagline: "Model yang membaca daun, menghitung buah, dan menandai penyakit.",
    description:
      "Model visi deep learning yang dilatih dengan citra lapangan untuk mendeteksi hawar, karat, dan kerusakan akibat hama, menghitung tanaman dan buah, serta menilai mutu hasil panen, mengubah kamera biasa menjadi pengamat ahli yang tak kenal lelah.",
    benefits: [
      "Deteksi dini penyakit",
      "Penilaian yang konsisten dan objektif",
      "Berjalan di perangkat edge yang terjangkau",
    ],
    applications: ["Deteksi penyakit", "Penghitungan buah", "Penentuan mutu hasil panen"],
  },
  ml: {
    label: "Machine Learning & AI",
    tagline: "Mengubah data lapangan bermusim-musim menjadi prediksi yang bisa ditindaklanjuti petani.",
    description:
      "Dari prakiraan hasil panen hingga penjadwalan irigasi, model machine learning menjadi inti smartagri. Model ini memadukan aliran data sensor, citra, dan cuaca menjadi peringatan dini dan rekomendasi yang disesuaikan dengan kondisi setempat.",
    benefits: [
      "Prakiraan hasil panen satu musim ke depan",
      "Mempelajari perilaku lahan setempat",
      "Makin akurat seiring bertambahnya data tiap musim",
    ],
    applications: ["Prediksi hasil panen", "Deteksi anomali", "Mesin rekomendasi"],
  },
  eis: {
    label: "Penginderaan Tanaman EIS",
    tagline: "Membaca fisiologi tanaman melalui impedansi listrik.",
    description:
      "Electrical impedance spectroscopy mengalirkan sinyal sangat kecil melalui jaringan tanaman untuk mengestimasi klorofil dan status fisiologis tanpa melukai tanaman, sebuah kekhasan riset smartagri yang telah terbit di jurnal internasional.",
    benefits: [
      "Penginderaan fisiologis tanpa merusak",
      "Instrumentasi berbiaya rendah",
      "Melengkapi metode optik",
    ],
    applications: ["Estimasi klorofil", "Pemeriksaan kesehatan tanaman", "Fenotiping"],
  },
  "climate-control": {
    label: "Sistem Kendali Iklim",
    tagline: "Kendali umpan balik yang menjaga lingkungan tumbuh tetap ideal.",
    description:
      "Pengendali yang mengatur suhu, kelembapan, dan vapor pressure deficit (VPD) di greenhouse dan plant factory. Riset kendali VPD kami menunjukkan bagaimana lingkungan yang dikelola ketat berdampak langsung pada pertumbuhan dan hasil panen.",
    benefits: [
      "Kondisi tumbuh optimal yang stabil",
      "Laju pertumbuhan dan hasil panen lebih tinggi",
      "Penggunaan energi dan air yang efisien",
    ],
    applications: ["Plant factory", "Smart greenhouse", "Kendali VPD"],
  },
  irrigation: {
    label: "Kendali Irigasi Cerdas",
    tagline: "Air diberikan tepat kapan dan di mana tanaman membutuhkannya.",
    description:
      "Katup dan pompa berbasis sensor yang mengairi sesuai kebutuhan tanaman, bukan berdasarkan timer tetap (dari irigasi tetes dan sprinkler hingga jaringan saluran yang dimodernkan), sehingga menghemat air sambil menjaga hasil panen.",
    benefits: [
      "Penghematan air yang signifikan",
      "Limpasan dan pencucian hara berkurang",
      "Berlaku dari irigasi tetes hingga saluran",
    ],
    applications: ["Penjadwalan otomatis", "Telemetri saluran", "Kendali sprinkler"],
  },
  geospatial: {
    label: "Analitik Geospasial",
    tagline: "Setiap pengukuran di peta, setiap keputusan per petak.",
    description:
      "Menyatukan ortomosaik drone, citra satelit, dan lokasi sensor menjadi peta per petak. Analisis geospasial mengubah pengukuran yang tersebar menjadi peta zona yang memandu pemantauan, perlakuan, dan perencanaan.",
    benefits: [
      "Zona pengelolaan per petak",
      "Pemetaan batas lahan",
      "Tampilan berlapis lintas musim",
    ],
    applications: ["Pemetaan ortomosaik", "Pengelolaan zona", "Perencanaan perkebunan"],
  },
  weather: {
    label: "Pemodelan Cuaca & Iklim",
    tagline: "Prakiraan musiman yang disesuaikan dengan keputusan petani kecil.",
    description:
      "Prakiraan hasil downscaling dan prospek iklim musiman yang dibangun bersama mitra seperti BMKG, untuk menjawab pertanyaan yang benar-benar diajukan petani: apa yang ditanam, kapan menanam, dan bagaimana mengantisipasi musim hujan yang terlambat.",
    benefits: [
      "Prakiraan yang dikalibrasi secara lokal",
      "Sinyal perencanaan satu musim ke depan",
      "Indikator risiko iklim",
    ],
    applications: ["Kalender tanam", "Peringatan dini kekeringan", "Imbauan risiko"],
  },
  dss: {
    label: "Sistem Pendukung Keputusan",
    tagline: "Dashboard yang berujung pada keputusan, bukan sekadar kumpulan data.",
    description:
      "Lapisan yang benar-benar disentuh petani dan koperasi: dashboard dan imbauan yang memadukan semua teknologi di atas menjadi rekomendasi sederhana, seperti petak mana yang dipantau lebih dulu, kapan mengairi, dan apa yang bisa diharapkan saat panen.",
    benefits: [
      "Rekomendasi dalam bahasa sehari-hari",
      "Dirancang bersama koperasi petani",
      "Berjalan di ponsel biasa",
    ],
    applications: ["Dashboard pertanian", "Pesan imbauan", "Pelaporan koperasi"],
  },
};

export function technologiesFor(lang: Lang): Technology[] {
  return localizeAll(TECHNOLOGIES, TECHNOLOGIES_ID, (t) => t.id, lang);
}

/** Display name of a technology given its English label (the key in research.ts). */
export function techLabel(label: string, lang: Lang): string {
  if (lang === "en") return label;
  const tech = TECHNOLOGIES.find((t) => t.label === label);
  return (tech && TECHNOLOGIES_ID[tech.id]?.label) || label;
}
