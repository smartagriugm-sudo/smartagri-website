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
  },
  {
    name: "Kyushu University",
    logo: partnerLogo("kyushu-university.png"),
    group: "University",
  },
  {
    name: "Ehime University",
    logo: partnerLogo("ehime-university.svg"),
    group: "University",
  },
  {
    name: "Kangwon National University",
    logo: partnerLogo("kangwon-national-university.png"),
    group: "University",
  },
  {
    name: "Chungnam National University",
    logo: partnerLogo("chungnam-national-university.png"),
    group: "University",
  },
  {
    name: "Seoul National University",
    logo: partnerLogo("seoul-national-university.svg"),
    group: "University",
  },
  {
    name: "Maejo University",
    logo: partnerLogo("maejo-university.png"),
    group: "University",
  },
  {
    name: "Kasetsart University",
    logo: partnerLogo("kasetsart-university.png"),
    group: "University",
  },
  {
    name: "Universiti Putra Malaysia",
    logo: partnerLogo("universiti-putra-malaysia.svg"),
    group: "University",
  },

  // Ministries
  {
    name: "Kementerian Pekerjaan Umum",
    logo: partnerLogo("kementerian-pu.png"),
    group: "Ministry",
  },
  {
    name: "Kementerian Pertanian",
    logo: partnerLogo("kementerian-pertanian.png"),
    group: "Ministry",
  },

  // Government institutions
  { name: "BMKG", logo: partnerLogo("bmkg.png"), group: "Government Institution" },
  { name: "BRIN", logo: partnerLogo("brin.svg"), group: "Government Institution" },
  {
    name: "BI Institute",
    logo: partnerLogo("bi-institute.svg"),
    group: "Government Institution",
  },

  // State-owned enterprises (BUMN)
  {
    name: "Pertamina Patra Niaga",
    logo: partnerLogo("pertamina-patra-niaga.png"),
    group: "State-Owned Enterprise",
  },

  // Private companies
  { name: "NVIDIA", logo: partnerLogo("nvidia.svg"), group: "Private Company" },
  {
    name: "Indosat Ooredoo Hutchison",
    logo: partnerLogo("indosat-ooredoo-hutchison.png"),
    group: "Private Company",
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

  // Research centers & organizations
  {
    name: "Perhimpunan Teknik Pertanian Indonesia",
    logo: partnerLogo("perteta.png"),
    group: "Research Center & Organization",
  },
  {
    name: "Pusat Kajian Modernisasi Irigasi dan Pertanian",
    logo: partnerLogo("pkmip.png"),
    group: "Research Center & Organization",
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
  },
  {
    name: "WGFS 1.2 Precision Agriculture & Smart Farming",
    logo: partnerLogo("wgfs.svg"),
    group: "Research Center & Organization",
  },

  // Farmer groups
  {
    name: "KWT Teratai Mekar",
    logo: partnerLogo("kwt-teratai-mekar.svg"),
    group: "Farmer Group",
  },
  {
    name: "Taruna Tani",
    logo: partnerLogo("taruna-tani.svg"),
    group: "Farmer Group",
  },
];
