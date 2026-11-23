import { PUBLICATIONS, type Publication } from "./publications";
import { teamPhoto } from "./assets";
import { localize, type Lang } from "./i18n-core";

export type TeamCategory = "Lecturer" | "Researcher" | "Student" | "Past Member";

export const TEAM_CATEGORIES: TeamCategory[] = [
  "Lecturer",
  "Researcher",
  "Student",
  "Past Member",
];

export type TeamMember = {
  slug: string;
  /** Clean name without titles; used on cards and for publication matching */
  name: string;
  /** Full name with academic titles; shown on the profile page */
  fullName: string;
  role: string;
  category: TeamCategory;
  coordinator?: boolean;
  /** Core members appear on the About Us page */
  core: boolean;
  /** Short bio paragraph. TODO: have each member review/replace. */
  bio: string;
  /** TODO: have each member review/replace. */
  expertise: string[];
  /** Ongoing projects / research. TODO: have each member review/replace. */
  projects: string[];
  /** Optional portrait photo (e.g. /brand/team/<slug>.webp) */
  photo?: string;
  /** Optional; buttons appear on the profile page when filled */
  email?: string;
  linkedin?: string;
  /** UGM academic staff profile (acadstaff.ugm.ac.id) */
  acadstaff?: string;
  /** Google Scholar profile */
  scholar?: string;
};

export const TEAM: TeamMember[] = [
  {
    slug: "andri-prima-nugroho",
    name: "Andri Prima Nugroho",
    fullName:
      "Ir. Andri Prima Nugroho, S.T.P., M.Sc., Ph.D., IPU., ASEAN Eng., APEC Eng.",
    role: "Research Group Coordinator · Lecturer",
    category: "Lecturer",
    coordinator: true,
    core: true,
    bio: "Coordinator of the Smart Agriculture Research Center and lecturer at the Department of Agricultural and Biosystems Engineering, UGM. His work centers on agricultural informatics and precision agriculture, from precision livestock farming and smart greenhouses to IoT and big-data estimation of crop water requirements.",
    expertise: [
      "Agricultural informatics",
      "Precision agriculture",
      "IoT sensing",
      "Smart farming systems",
    ],
    projects: [
      "Precision livestock farming and decision-support systems",
      "IoT and big-data crop water requirement estimation",
      "Smart estate technology for oil-palm land management",
    ],
    acadstaff: "https://acadstaff.ugm.ac.id/andrew",
    scholar:
      "https://scholar.google.com/citations?user=OcZOXugAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "lilik-sutiarso",
    name: "Lilik Sutiarso",
    fullName: "Prof. Dr. Ir. Lilik Sutiarso, M.Eng., IPU., ASEAN Eng., APEC Eng.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Professor of agricultural and biosystems engineering at UGM. His work centers on agricultural systems, precision farming, and intelligent control systems, from integrated smart farming systems to precision agricultural technology for sustainable production.",
    expertise: [
      "Agricultural systems",
      "Precision farming",
      "Intelligent control systems",
    ],
    projects: [
      "Integrated smart farming systems",
      "Precision agricultural technology for horticulture",
    ],
    acadstaff: "https://acadstaff.ugm.ac.id/Soetiarso",
    scholar: "https://scholar.google.com/citations?user=JHLikMoAAAAJ&hl=en",
  },
  {
    slug: "murtiningrum",
    name: "Murtiningrum",
    fullName: "Dr. Ir. Murtiningrum, S.T.P., M.Eng., IPU., ASEAN Eng.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Lecturer at the Department of Agricultural and Biosystems Engineering, UGM, specializing in irrigation engineering and irrigation management. Her work spans smart irrigation water management, drip and mist irrigation for vegetables, irrigation modernization, and cloud-integrated soil moisture and water-level monitoring.",
    expertise: [
      "Irrigation engineering",
      "Irrigation management",
      "Smart water management",
    ],
    projects: [
      "Smart irrigation water management in the Kedung Putri irrigation area",
      "Drip and mist irrigation for vegetable crops",
      "Cloud-integrated soil moisture and water-level monitoring",
    ],
    acadstaff: "https://acadstaff.ugm.ac.id/tiningm",
    scholar: "https://scholar.google.com/citations?user=MMtGyvQAAAAJ&hl=en",
  },
  {
    slug: "mohammad-affan-fajar-falah",
    name: "Mohammad Affan Fajar Falah",
    fullName: "Prof. Mohammad Affan Fajar Falah, S.T.P., M.Agr., Ph.D.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Professor focusing on controlled-environment agriculture and postharvest technology, from plant-factory production systems to the quality of fresh produce after harvest.",
    expertise: [
      "Controlled environment agriculture",
      "Postharvest technology",
      "Product quality",
    ],
    projects: [
      "Vapor pressure deficit (VPD) control in micro-plant factories",
      "Urban mini-plant factory production systems",
    ],
    acadstaff: "https://acadstaff.ugm.ac.id/MTk3NTA0MTAxOTk5MDMxMDAx",
    scholar:
      "https://scholar.google.com/citations?user=U4-hOxAAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "prieskarinda-lestari",
    name: "Prieskarinda Lestari",
    fullName: "Dr. Prieskarinda Lestari, S.T., IPM.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Lecturer at the Department of Agricultural and Biosystems Engineering, UGM, working on environmental engineering, solid and agricultural waste management, and the valorization of agro-industrial waste, including microplastic pollution and water-quality monitoring.",
    expertise: [
      "Environmental engineering",
      "Agricultural waste management",
      "Plastic pollution",
    ],
    projects: [
      "Biodegradable products from tropical agro-industrial waste",
      "Microplastic pollution and water-quality monitoring",
    ],
    acadstaff: "https://acadstaff.ugm.ac.id/prieskarindalestari",
    scholar:
      "https://scholar.google.com/citations?user=wpZYUaMAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "ardan-wiratmoko",
    name: "Ardan Wiratmoko",
    fullName: "Ardan Wiratmoko, S.T.P., M.Sc.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Lecturer and researcher at UGM working on agricultural energy and machinery, smart estate technology, and smart farming systems. His work uses UAV platforms for multispectral mapping, crop scouting, and precision spraying across fields and estates, alongside plant-factory monitoring, integrated land management, and smart water management.",
    expertise: [
      "UAV mapping & remote sensing",
      "Multispectral crop monitoring",
      "Agricultural energy & machinery",
      "Smart estate technology",
      "Smart farming systems",
    ],
    projects: [
      "UAV multispectral mapping for crop monitoring",
      "Smart estate technology for oil-palm land management",
      "Smart water management in irrigation areas",
    ],
    acadstaff: "https://acadstaff.ugm.ac.id/ardanw",
    scholar:
      "https://scholar.google.com/citations?user=xsdMesgAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "muhammad-athala-fawwaz-dzaky",
    name: "Muhammad Athala Fawwaz Dzaky",
    fullName: "Muhammad Athala Fawwaz Dzaky, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher in controlled-environment agriculture. First author of the center's Scientia Horticulturae paper on vapor pressure deficit (VPD) control in micro-plant factories for spinach microgreens production.",
    expertise: ["Indoor Farming Management"],
    projects: [
      "VPD control in micro-plant factories",
      "Smart greenhouse climate systems",
    ],
    scholar:
      "https://scholar.google.com/citations?user=MrA1hJYAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "fadel-arya-pradana",
    name: "Fadel Arya Pradana",
    fullName: "Fadel Arya Pradana, S.Si.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher working on remote sensing and data analysis for precision agriculture, including UAV multispectral monitoring of crop physiological performance.",
    expertise: ["Precision Agricultural Systems Engineering"],
    projects: ["UAV-VTOL multispectral monitoring for precision agriculture"],
    scholar:
      "https://scholar.google.com/citations?user=RiNC6lUAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "samuel-gatot-marseno",
    name: "Samuel Gatot Marseno",
    fullName: "Samuel Gatot Marseno, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher at the Smart Agriculture Research Center working on agricultural automation and smart farming systems.",
    expertise: ["Smart Environmental System"],
    projects: ["Smart farming field deployments"],
  },
  {
    slug: "saifuddin-afif",
    name: "Saifuddin Afif",
    fullName: "Saifuddin Afif, S.T.P., M.Sc.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher focusing on sensor development and instrumentation, including electrical impedance spectroscopy (EIS) approaches for non-destructive plant physiological measurement.",
    expertise: ["Plant Electrophysiology & Electrical Spectroscopy"],
    projects: ["EIS-based chlorophyll estimation in leafy crops"],
    scholar:
      "https://scholar.google.com/citations?user=AJP86NUAAAAJ&hl=en&oi=ao",
  },
  {
    slug: "fathuzaky-setyawan",
    name: "Fathuzaky Setyawan",
    fullName: "Fathuzaky Setyawan",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher at the Smart Agriculture Research Center working on agricultural data systems engineering.",
    expertise: ["Agricultural Data Systems Engineering"],
    projects: ["Smart farming research programs"],
  },
  {
    slug: "diena-itaul-mufida",
    name: "Diena Ita'ul Mufida",
    fullName: "Diena Ita'ul Mufida, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher at the Smart Agriculture Research Center working on smart agricultural systems and field research programs.",
    expertise: ["Plant Sensing & Phenotyping"],
    projects: ["Smart farming research programs"],
  },
  {
    slug: "fahmi-arsyad",
    name: "Fahmi Arsyad",
    fullName: "Fahmi Arsyad, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher working on UAV-based multispectral monitoring and field operations, and an active contributor to the center's research communication.",
    expertise: ["Smart UAV Technology"],
    projects: ["UAV-VTOL multispectral monitoring for precision agriculture"],
  },
  {
    slug: "mutiara-alifia-ramadhanty",
    name: "Mutiara Alifia Ramadhanty",
    fullName: "Mutiara Alifia Ramadhanty",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher working on multispectral data analysis for crop monitoring within the center's precision agriculture program.",
    expertise: ["Smart UAV Technology"],
    projects: ["UAV-VTOL multispectral monitoring for precision agriculture"],
  },
  {
    slug: "muhammad-fajar-ridho-ilham",
    name: "Muhammad Fajar Ridho Ilham",
    fullName: "Muhammad Fajar Ridho Ilham",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher at the Smart Agriculture Research Center working on spectral data analytics for precision agriculture.",
    expertise: ["Spectral Data Analytics"],
    projects: ["Smart farming research programs"],
  },
  {
    slug: "ardan-desta-vaunendra",
    name: "Ardan Desta Vaunendra",
    fullName: "Ardan Desta Vaunendra",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher working on precision irrigation for coastal sandy soils. His undergraduate thesis built an IoT sprinkler controller that combines reference evapotranspiration from an automatic weather station with soil moisture readings in a Mamdani fuzzy logic model to set irrigation duration, tested in the field in Kulon Progo.",
    expertise: ["Precision Irrigation & IoT Control"],
    projects: ["Fuzzy logic sprinkler irrigation for coastal sandy soils"],
  },
];

// Members with a white-background portrait in public/brand/team/<slug>.webp.
// Listed explicitly so a member without a photo file falls back to initials
// instead of pointing at a missing image.
const SLUGS_WITH_PHOTO = new Set<string>([
  "andri-prima-nugroho",
  "lilik-sutiarso",
  "murtiningrum",
  "mohammad-affan-fajar-falah",
  "muhammad-fajar-ridho-ilham",
  "prieskarinda-lestari",
  "ardan-wiratmoko",
  "muhammad-athala-fawwaz-dzaky",
  "fadel-arya-pradana",
  "samuel-gatot-marseno",
  "saifuddin-afif",
  "diena-itaul-mufida",
  "fahmi-arsyad",
  "mutiara-alifia-ramadhanty",
  "fathuzaky-setyawan",
  "ardan-desta-vaunendra",
]);

for (const member of TEAM) {
  if (SLUGS_WITH_PHOTO.has(member.slug)) {
    member.photo = teamPhoto(member.slug);
  }
}

export function findMember(slug: string): TeamMember | undefined {
  return TEAM.find((member) => member.slug === slug);
}

export function coreMembers(): TeamMember[] {
  return TEAM.filter((member) => member.core);
}

export function membersByCategory(category: TeamCategory): TeamMember[] {
  return TEAM.filter((member) => member.category === category);
}

// Naive author match on the member's last name; good enough while the
// roster has unique last names. TODO: switch to explicit publication slugs
// per member if last names ever collide.
export function publicationsFor(member: TeamMember): Publication[] {
  const lastName = member.name.split(" ").pop()!.toLowerCase();
  return PUBLICATIONS.filter((pub) =>
    pub.authors.toLowerCase().includes(lastName),
  );
}

export const memberGradients = [
  "linear-gradient(160deg, #0B6477 0%, #14919B 100%)",
  "linear-gradient(160deg, #14919B 0%, #0AD1C8 100%)",
  "linear-gradient(160deg, #08313A 0%, #0B6477 100%)",
  "linear-gradient(160deg, #14919B 0%, #45DFB1 100%)",
];

export function memberInitials(name: string) {
  return name
    .split(" ")
    .filter((part) => /^[A-Z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

// ---- Bahasa Indonesia (see lib/i18n.tsx) ----
// Indonesian copy per member slug (role, bio, expertise, projects).
const TEAM_ID: Record<string, Partial<TeamMember>> = {
  "andri-prima-nugroho": {
    role: "Koordinator Kelompok Riset · Dosen",
    bio: "Koordinator Smart Agriculture Research Center dan dosen di Departemen Teknik Pertanian dan Biosistem, UGM. Fokus kerjanya adalah informatika pertanian dan pertanian presisi, mulai dari precision livestock farming dan smart greenhouse hingga estimasi kebutuhan air tanaman berbasis IoT dan big data.",
    expertise: [
      "Informatika pertanian",
      "Pertanian presisi",
      "Penginderaan berbasis IoT",
      "Sistem smart farming",
    ],
    projects: [
      "Precision livestock farming dan sistem pendukung keputusan",
      "Estimasi kebutuhan air tanaman berbasis IoT dan big data",
      "Teknologi smart estate untuk pengelolaan lahan kelapa sawit",
    ],
  },
  "lilik-sutiarso": {
    role: "Dosen",
    bio: "Guru Besar teknik pertanian dan biosistem di UGM. Fokus kerjanya adalah sistem pertanian, pertanian presisi, dan sistem kendali cerdas, mulai dari sistem smart farming terpadu hingga teknologi pertanian presisi untuk produksi yang berkelanjutan.",
    expertise: [
      "Sistem pertanian",
      "Pertanian presisi",
      "Sistem kendali cerdas",
    ],
    projects: [
      "Sistem smart farming terpadu",
      "Teknologi pertanian presisi untuk hortikultura",
    ],
  },
  murtiningrum: {
    role: "Dosen",
    bio: "Dosen di Departemen Teknik Pertanian dan Biosistem, UGM, dengan keahlian teknik irigasi dan pengelolaan irigasi. Kerjanya meliputi pengelolaan air irigasi cerdas, irigasi tetes dan kabut untuk sayuran, modernisasi irigasi, serta pemantauan kelembapan tanah dan muka air yang terintegrasi dengan cloud.",
    expertise: [
      "Teknik irigasi",
      "Pengelolaan irigasi",
      "Pengelolaan air cerdas",
    ],
    projects: [
      "Pengelolaan air irigasi cerdas di Daerah Irigasi Kedung Putri",
      "Irigasi tetes dan kabut untuk tanaman sayuran",
      "Pemantauan kelembapan tanah dan muka air terintegrasi cloud",
    ],
  },
  "mohammad-affan-fajar-falah": {
    role: "Dosen",
    bio: "Guru Besar dengan fokus pada pertanian lingkungan terkendali dan teknologi pascapanen, mulai dari sistem produksi plant factory hingga mutu produk segar setelah panen.",
    expertise: [
      "Pertanian lingkungan terkendali",
      "Teknologi pascapanen",
      "Mutu produk",
    ],
    projects: [
      "Pengendalian vapor pressure deficit (VPD) di micro plant factory",
      "Sistem produksi mini plant factory perkotaan",
    ],
  },
  "prieskarinda-lestari": {
    role: "Dosen",
    bio: "Dosen di Departemen Teknik Pertanian dan Biosistem, UGM, yang menekuni teknik lingkungan, pengelolaan limbah padat dan limbah pertanian, serta valorisasi limbah agroindustri, termasuk pencemaran mikroplastik dan pemantauan kualitas air.",
    expertise: [
      "Teknik lingkungan",
      "Pengelolaan limbah pertanian",
      "Pencemaran plastik",
    ],
    projects: [
      "Produk biodegradable dari limbah agroindustri tropis",
      "Pencemaran mikroplastik dan pemantauan kualitas air",
    ],
  },
  "ardan-wiratmoko": {
    role: "Dosen",
    bio: "Dosen dan peneliti di UGM yang menekuni energi dan mesin pertanian, teknologi smart estate, dan sistem smart farming. Ia memanfaatkan platform UAV untuk pemetaan multispektral, pemantauan tanaman, dan penyemprotan presisi di lahan dan perkebunan, serta pemantauan plant factory, pengelolaan lahan terpadu, dan pengelolaan air cerdas.",
    expertise: [
      "Pemetaan UAV & penginderaan jauh",
      "Pemantauan tanaman multispektral",
      "Energi & mesin pertanian",
      "Teknologi smart estate",
      "Sistem smart farming",
    ],
    projects: [
      "Pemetaan multispektral UAV untuk pemantauan tanaman",
      "Teknologi smart estate untuk pengelolaan lahan kelapa sawit",
      "Pengelolaan air cerdas di daerah irigasi",
    ],
  },
  "muhammad-athala-fawwaz-dzaky": {
    role: "Peneliti",
    bio: "Peneliti di bidang pertanian lingkungan terkendali. Penulis pertama makalah pusat riset di Scientia Horticulturae tentang pengendalian vapor pressure deficit (VPD) di micro plant factory untuk produksi microgreens bayam.",
    expertise: ["Manajemen Indoor Farming"],
    projects: [
      "Pengendalian VPD di micro plant factory",
      "Sistem iklim smart greenhouse",
    ],
  },
  "fadel-arya-pradana": {
    role: "Peneliti",
    bio: "Peneliti di bidang penginderaan jauh dan analisis data untuk pertanian presisi, termasuk pemantauan kinerja fisiologis tanaman dengan UAV multispektral.",
    expertise: ["Rekayasa Sistem Pertanian Presisi"],
    projects: ["Pemantauan multispektral UAV-VTOL untuk pertanian presisi"],
  },
  "samuel-gatot-marseno": {
    role: "Peneliti",
    bio: "Peneliti di Smart Agriculture Research Center yang menekuni otomasi pertanian dan sistem smart farming.",
    expertise: ["Sistem Lingkungan Cerdas"],
    projects: ["Penerapan smart farming di lapangan"],
  },
  "saifuddin-afif": {
    role: "Peneliti",
    bio: "Peneliti dengan fokus pada pengembangan sensor dan instrumentasi, termasuk pendekatan electrical impedance spectroscopy (EIS) untuk pengukuran fisiologis tanaman secara nondestruktif.",
    expertise: ["Elektrofisiologi & Spektroskopi Elektrik Tanaman"],
    projects: ["Estimasi klorofil berbasis EIS pada sayuran daun"],
  },
  "fathuzaky-setyawan": {
    role: "Peneliti",
    bio: "Peneliti di Smart Agriculture Research Center yang menekuni rekayasa sistem data pertanian.",
    expertise: ["Rekayasa Sistem Data Pertanian"],
    projects: ["Program riset smart farming"],
  },
  "diena-itaul-mufida": {
    role: "Peneliti",
    bio: "Peneliti di Smart Agriculture Research Center yang menekuni sistem pertanian cerdas dan program riset lapangan.",
    expertise: ["Penginderaan & Fenotiping Tanaman"],
    projects: ["Program riset smart farming"],
  },
  "fahmi-arsyad": {
    role: "Peneliti",
    bio: "Peneliti di bidang pemantauan multispektral berbasis UAV dan operasi lapangan, sekaligus aktif dalam komunikasi riset pusat ini.",
    expertise: ["Teknologi UAV Cerdas"],
    projects: ["Pemantauan multispektral UAV-VTOL untuk pertanian presisi"],
  },
  "mutiara-alifia-ramadhanty": {
    role: "Peneliti",
    bio: "Peneliti di bidang analisis data multispektral untuk pemantauan tanaman dalam program pertanian presisi pusat ini.",
    expertise: ["Teknologi UAV Cerdas"],
    projects: ["Pemantauan multispektral UAV-VTOL untuk pertanian presisi"],
  },
  "muhammad-fajar-ridho-ilham": {
    role: "Peneliti",
    bio: "Peneliti di Smart Agriculture Research Center yang menekuni analitik data spektral untuk pertanian presisi.",
    expertise: ["Analitik Data Spektral"],
    projects: ["Program riset smart farming"],
  },
  "ardan-desta-vaunendra": {
    role: "Peneliti",
    bio: "Peneliti di bidang irigasi presisi untuk lahan pasir pantai. Skripsinya membangun pengendali sprinkler IoT yang menggabungkan evapotranspirasi acuan dari stasiun cuaca otomatis dengan data kelembapan tanah dalam model logika fuzzy Mamdani untuk menentukan durasi irigasi, dan diuji di lapangan di Kulon Progo.",
    expertise: ["Irigasi Presisi & Kendali IoT"],
    projects: ["Irigasi sprinkler berbasis logika fuzzy untuk lahan pasir pantai"],
  },
};

export function localizeMember(member: TeamMember, lang: Lang): TeamMember {
  return localize(member, TEAM_ID[member.slug], lang);
}

const TEAM_CATEGORY_ID: Record<TeamCategory, string> = {
  Lecturer: "Dosen",
  Researcher: "Peneliti",
  Student: "Mahasiswa",
  "Past Member": "Alumni",
};

export function teamCategoryLabel(category: TeamCategory, lang: Lang): string {
  return lang === "id" ? TEAM_CATEGORY_ID[category] : category;
}
