import { partnerLogo } from "./assets";

export type PartnerGroup =
  | "University"
  | "Ministry"
  | "Government Institution"
  | "State-Owned Enterprise"
  | "Private Company"
  | "Research Center & Organization"
  | "Farmer Group";

export type Partner = {
  name: string;
  logo: string | null;
  group: PartnerGroup;
  /**
   * Kept in the roster but withheld from public display.
   *
   * Archiving rather than deleting: the relationship is still recorded here,
   * so restoring one is a matter of removing this flag, not finding the logo
   * and the exact name again. Anything reading the roster for display should
   * use ACTIVE_PARTNERS.
   */
  archived?: boolean;
  /**
   * Short, verified descriptor shown when the logo is hovered (full name,
   * country, or role). Leave it out rather than guess: the card then shows
   * the partner group instead.
   */
  note?: string;
};

// Real partner roster, ordered by organization type:
// universities → ministries → government institutions → BUMN → private
// companies → research centers & organizations → farmer groups.
// Within each group the order follows the center's preference.
export const PARTNERS: Partner[] = [
  // Universities
  {
    name: "Wageningen University & Research",
    logo: partnerLogo("wageningen-university-research.svg"),
    group: "University",
    note: "Netherlands",
  },
  {
    name: "Kyushu University",
    logo: partnerLogo("kyushu-university.png"),
    group: "University",
    note: "Japan",
  },
  {
    name: "Ehime University",
    logo: partnerLogo("ehime-university.svg"),
    group: "University",
    note: "Japan",
  },
  {
    name: "Kangwon National University",
    logo: partnerLogo("kangwon-national-university.png"),
    group: "University",
    note: "South Korea",
  },
  {
    name: "Chungnam National University",
    logo: partnerLogo("chungnam-national-university.png"),
    group: "University",
    note: "South Korea",
  },
  {
    name: "Seoul National University",
    logo: partnerLogo("seoul-national-university.svg"),
    group: "University",
    note: "South Korea",
  },
  {
    name: "Maejo University",
    logo: partnerLogo("maejo-university.png"),
    group: "University",
    note: "Thailand",
  },
  {
    name: "Kasetsart University",
    logo: partnerLogo("kasetsart-university.png"),
    group: "University",
    note: "Thailand",
  },
  {
    name: "Universiti Putra Malaysia",
    logo: partnerLogo("universiti-putra-malaysia.svg"),
    group: "University",
    note: "Malaysia",
  },

  // Ministries
  {
    name: "Kementerian Pekerjaan Umum",
    logo: partnerLogo("kementerian-pu.png"),
    group: "Ministry",
    note: "Ministry of Public Works",
  },
  {
    name: "Kementerian Pertanian",
    logo: partnerLogo("kementerian-pertanian.png"),
    group: "Ministry",
    note: "Ministry of Agriculture",
  },

  // Government institutions
  {
    name: "BMKG",
    logo: partnerLogo("bmkg.png"),
    group: "Government Institution",
    note: "Badan Meteorologi, Klimatologi, dan Geofisika",
  },
  {
    name: "BRIN",
    logo: partnerLogo("brin.svg"),
    group: "Government Institution",
    note: "Badan Riset dan Inovasi Nasional",
  },
  {
    name: "BI Institute",
    logo: partnerLogo("bi-institute.svg"),
    group: "Government Institution",
    note: "Bank Indonesia",
  },

  // State-owned enterprises (BUMN)
  {
    name: "Pertamina Patra Niaga",
    logo: partnerLogo("pertamina-patra-niaga.png"),
    group: "State-Owned Enterprise",
    note: "Pertamina Group",
  },

  // Private companies
  {
    name: "NVIDIA",
    logo: partnerLogo("nvidia.svg"),
    group: "Private Company",
    archived: true,
  },
  {
    name: "Indosat Ooredoo Hutchison",
    logo: partnerLogo("indosat-ooredoo-hutchison.png"),
    group: "Private Company",
    archived: true,
  },
  {
    name: "Wilmar International",
    logo: partnerLogo("wilmar-international.png"),
    group: "Private Company",
  },
  {
    name: "BISI International",
    logo: partnerLogo("bisi-international.png"),
    group: "Private Company",
  },
  {
    name: "Hidronav Tehnikatama",
    logo: partnerLogo("hidronav-tehnikatama.png"),
    group: "Private Company",
  },
  {
    name: "Quantum Systems",
    logo: partnerLogo("quantum-systems.png"),
    group: "Private Company",
    note: "Via PT Quatindo Widjaya Adhirajasa",
  },
  {
    name: "Tribuana Solusi Inovasi Teknologi",
    logo: partnerLogo("tribuana-solusi-inovasi.png"),
    group: "Private Company",
  },
  {
    name: "Inamas Sintesis Teknologi",
    logo: partnerLogo("inamas-sintesis-teknologi.png"),
    group: "Private Company",
  },
  {
    name: "Cendekia Prima Inovasi",
    logo: partnerLogo("cendekia-prima-inovasi.png"),
    group: "Private Company",
  },
  {
    name: "AGRARISE",
    logo: partnerLogo("agrarise.png"),
    group: "Private Company",
  },
  {
    name: "Berkah Harmoni Makmur",
    logo: partnerLogo("berkah-harmoni-makmur.png"),
    group: "Private Company",
  },
  {
    name: "Altera",
    logo: partnerLogo("altera.svg"),
    group: "Private Company",
  },

  // Research centers & organizations
  {
    name: "Perhimpunan Teknik Pertanian Indonesia",
    logo: partnerLogo("perteta.png"),
    group: "Research Center & Organization",
    note: "PERTETA",
  },
  {
    name: "Pusat Kajian Modernisasi Irigasi dan Pertanian",
    logo: partnerLogo("pkmip.png"),
    group: "Research Center & Organization",
    note: "PKMIP, FTP UGM",
  },
  {
    name: "SIPASI",
    logo: partnerLogo("sipasi.png"),
    group: "Research Center & Organization",
  },
  {
    name: "PUAPT UGM",
    logo: partnerLogo("puapt-ugm.png"),
    group: "Research Center & Organization",
    note: "Pusat Unggulan Antar Perguruan Tinggi",
  },
  {
    name: "WGFS 1.2 Precision Agriculture & Smart Farming",
    logo: partnerLogo("wgfs.svg"),
    group: "Research Center & Organization",
    note: "Research team, FTP UGM",
  },

  // Farmer groups
  {
    name: "KWT Teratai Mekar",
    logo: partnerLogo("kwt-teratai-mekar.svg"),
    group: "Farmer Group",
    note: "Kelompok Wanita Tani",
  },
  {
    name: "Taruna Tani Hijaunya Cinta",
    logo: partnerLogo("taruna-tani.svg"),
    group: "Farmer Group",
  },
];

/** The roster as shown to visitors, with archived partners withheld. */
export const ACTIVE_PARTNERS: Partner[] = PARTNERS.filter((p) => !p.archived);
