import { PUBLICATIONS, type Publication } from "./publications";

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
    bio: "Coordinator of the Smart Agriculture Research Center and lecturer at the Department of Agricultural and Biosystems Engineering, UGM. His work spans smart farming systems, IoT-based field monitoring, and precision agriculture, supervising research from UAV multispectral monitoring to plant-factory environmental control.",
    expertise: [
      "Smart farming systems",
      "IoT sensing",
      "Precision agriculture",
      "Plant factory",
    ],
    projects: [
      "UAV-VTOL multispectral monitoring for precision agriculture",
      "EIS-based plant physiological sensing",
      "Smart greenhouse and plant factory systems",
    ],
  },
  {
    slug: "lilik-sutiarso",
    name: "Lilik Sutiarso",
    fullName: "Prof. Dr. Ir. Lilik Sutiarso, M.Eng., IPU., ASEAN Eng., APEC Eng.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Professor of agricultural and biosystems engineering at UGM with decades of work on agricultural systems engineering, mechanization, and decision-support modeling for sustainable agricultural production.",
    expertise: [
      "Agricultural systems engineering",
      "Mechanization",
      "Decision support modeling",
    ],
    projects: [
      "Decision-support systems for sustainable production",
      "Precision agriculture research supervision",
    ],
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
  },
  {
    slug: "prieskarinda-lestari",
    name: "Prieskarinda Lestari",
    fullName: "Dr. Prieskarinda Lestari, S.T., IPM.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Lecturer at the Department of Agricultural and Biosystems Engineering, UGM, working on environmental engineering and water-resource systems for agriculture.",
    expertise: [
      "Environmental engineering",
      "Water resources",
      "Irrigation systems",
    ],
    projects: ["Irrigation modernization research"],
  },
  {
    slug: "ardan-wiratmoko",
    name: "Ardan Wiratmoko",
    fullName: "Ardan Wiratmoko, S.T.P., M.Sc.",
    role: "Lecturer",
    category: "Lecturer",
    core: true,
    bio: "Lecturer and researcher specializing in spectral sensing for agriculture, from UAV-based multispectral mapping to hyperspectral analysis of crops in controlled environments, paired with machine learning.",
    expertise: [
      "Hyperspectral sensing",
      "UAV remote sensing",
      "Machine learning",
    ],
    projects: [
      "Hyperspectral monitoring of microgreens in plant factories",
      "UAV-VTOL multispectral monitoring of horticultural crops",
    ],
  },
  {
    slug: "muhammad-athala-fawwaz-dzaky",
    name: "Muhammad Athala Fawwaz Dzaky",
    fullName: "Muhammad Athala Fawwaz Dzaky, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher in controlled-environment agriculture. First author of the center's Scientia Horticulturae paper on vapor pressure deficit (VPD) control in micro-plant factories for spinach microgreens production.",
    expertise: [
      "Plant factory systems",
      "VPD & climate control",
      "Controlled environment agriculture",
    ],
    projects: [
      "VPD control in micro-plant factories",
      "Smart greenhouse climate systems",
    ],
  },
  {
    slug: "fadel-arya-pradana",
    name: "Fadel Arya Pradana",
    fullName: "Fadel Arya Pradana, S.Si.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher working on remote sensing and data analysis for precision agriculture, including UAV multispectral monitoring of crop physiological performance.",
    expertise: ["Remote sensing", "Data analysis", "Multispectral imagery"],
    projects: ["UAV-VTOL multispectral monitoring for precision agriculture"],
  },
  {
    slug: "samuel-gatot-marseno",
    name: "Samuel Gatot Marseno",
    fullName: "Samuel Gatot Marseno, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher at the Smart Agriculture Research Center working on agricultural automation and smart farming systems.",
    expertise: ["Agricultural automation", "Smart farming systems"],
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
    expertise: [
      "EIS instrumentation",
      "Sensor development",
      "Plant physiological sensing",
    ],
    projects: ["EIS-based chlorophyll estimation in leafy crops"],
  },
  {
    slug: "diena-itaul-mufida",
    name: "Diena Ita'ul Mufida",
    fullName: "Diena Ita'ul Mufida, S.T.P.",
    role: "Researcher",
    category: "Researcher",
    core: true,
    bio: "Researcher at the Smart Agriculture Research Center working on smart agricultural systems and field research programs.",
    expertise: ["Smart agriculture systems", "Field research"],
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
    expertise: [
      "UAV operations",
      "Multispectral monitoring",
      "Research communication",
    ],
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
    expertise: ["Multispectral data analysis", "Crop monitoring"],
    projects: ["UAV-VTOL multispectral monitoring for precision agriculture"],
  },
];

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
