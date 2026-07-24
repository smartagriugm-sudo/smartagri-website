import { PUBLICATIONS, type Publication } from "./publications";
import { teamPhoto } from "./assets";

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
    bio: "Lecturer and researcher at UGM working on agricultural energy and machinery, smart estate technology, and smart farming systems, from plant-factory monitoring to integrated land management and smart water management.",
    expertise: [
      "Agricultural energy & machinery",
      "Smart estate technology",
      "Smart farming systems",
    ],
    projects: [
      "Smart estate technology for oil-palm land management",
      "Smart water management in irrigation areas",
    ],
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
