import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MotionConfig, motion, type TargetAndTransition } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS, areaLabel } from "../lib/research";
import { TECHNOLOGIES, techLabel } from "../lib/technology";
import { headLang, localeOf, useLang, useT, type Bi, type Lang } from "../lib/i18n";
import AmbientWash from "../components/AmbientWash";
import { EASE, MaskLine, META } from "../components/NoteParts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/contact-us")({
  component: ContactUsPage,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        {
          title: l === "id" ? "Hubungi Kami | smartagri" : "Contact Us | smartagri",
        },
        {
          name: "description",
          content:
            l === "id"
              ? "Hubungi Smart Agriculture Research Center: ajukan pertanyaan, jajaki kolaborasi, atau kunjungi kami di Sleman, Yogyakarta."
              : "Get in touch with the Smart Agriculture Research Center: ask a question, explore a collaboration, or visit us in Sleman, Yogyakarta.",
        },
      ],
    };
  },
});

const CONTACT_EMAIL = "hello@smart-agri.id";

// Google Apps Script Web App that appends submissions to the team's
// "smartagri Inquiries" Google Sheet (see docs/setup/SETUP-INQUIRIES.md).
const INQUIRY_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxj-2d-hmXocr7OEag-oNrTy0yo3vUV40-DcmWx7K90ci9Lzol9iby6hcSyrT66k_M/exec";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=-7.7687041%2C110.3806344";

type Channel = {
  icon: typeof Mail;
  label: Bi;
  value: string | Bi;
  href?: string;
  external?: boolean;
  /** Text the copy button puts on the clipboard */
  copy?: string;
  /** The icon's hover move */
  move: TargetAndTransition;
};

const channels: Channel[] = [
  {
    icon: Mail,
    label: { en: "Email", id: "Email" },
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    copy: CONTACT_EMAIL,
    // Envelope flies off and comes back: sent.
    move: { x: [0, 12, -12, 0], y: [0, -12, 12, 0], opacity: [1, 0, 0, 1], transition: { duration: 0.7, times: [0, 0.4, 0.41, 1] } },
  },
  {
    icon: Phone,
    label: { en: "WhatsApp", id: "WhatsApp" },
    value: "+62 851-1122-0365",
    href: "https://wa.me/6285111220365",
    external: true,
    copy: "+6285111220365",
    // Phone ringing.
    move: { rotate: [0, -16, 16, -12, 12, -6, 0], transition: { duration: 0.6 } },
  },
  {
    icon: MapPin,
    label: { en: "Address", id: "Alamat" },
    value:
      "Jl. Flora Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281",
    href: MAPS_URL,
    external: true,
    // Pin dropping onto the map.
    move: { y: [0, -6, 0, -2, 0], transition: { duration: 0.7 } },
  },
  {
    icon: Clock,
    label: { en: "Office hours", id: "Jam kerja" },
    value: { en: "Monday–Friday, 08.00–16.00 WIB", id: "Senin–Jumat, 08.00–16.00 WIB" },
    // Clock hand going round.
    move: { rotate: [0, 360], transition: { duration: 0.9, ease: "easeInOut" } },
  },
];

// The inquiry flow, as the form below actually runs it.
const flow: { icon: typeof Mail; title: Bi; desc: Bi }[] = [
  {
    icon: Pencil,
    title: { en: "Fill in the form", id: "Isi formulir" },
    desc: {
      en: "Tell us who you are and what you need. Only the starred fields are required.",
      id: "Ceritakan siapa Anda dan apa yang Anda butuhkan. Hanya kolom bertanda bintang yang wajib diisi.",
    },
  },
  {
    icon: ClipboardCheck,
    title: { en: "Review it", id: "Periksa kembali" },
    desc: {
      en: "Check every answer on one screen and edit anything before it goes.",
      id: "Tinjau semua jawaban dalam satu layar dan ubah apa pun sebelum dikirim.",
    },
  },
  {
    icon: Send,
    title: { en: "Send it", id: "Kirim" },
    desc: {
      en: "Your inquiry goes straight to the smartagri team.",
      id: "Pesan Anda langsung diterima tim smartagri.",
    },
  },
  {
    icon: FileText,
    title: { en: "Keep your ID", id: "Simpan ID Anda" },
    desc: {
      en: "You get an inquiry ID and can download a PDF summary for follow-up.",
      id: "Anda mendapat ID pesan dan dapat mengunduh ringkasan PDF untuk tindak lanjut.",
    },
  },
];

function ChannelCard({ c, index }: { c: Channel; index: number }) {
  const t = useT();
  const label = t(c.label);
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const Body = c.href ? "a" : "div";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: EASE }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative flex h-full flex-col rounded-[24px] border border-[#0B6477]/10 bg-white/90 transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl"
    >
      <Body
        {...(c.href ? { href: c.href, target: c.external ? "_blank" : undefined, rel: c.external ? "noreferrer" : undefined } : {})}
        className="flex flex-1 flex-col gap-4 p-6"
      >
        <span className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B6477] text-[#45DFB1] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]">
            <motion.span className="inline-flex" animate={hover ? c.move : { x: 0, y: 0, rotate: 0, opacity: 1 }}>
              <c.icon className="h-5 w-5" />
            </motion.span>
          </span>
          {c.href && (
            <ArrowUpRight className="h-4 w-4 text-[#0B6477] transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-[#45DFB1]" />
          )}
        </span>
        <span className={`text-neutral-400 transition-colors duration-300 group-hover:text-[#45DFB1] ${META}`} style={body}>
          {label}
        </span>
        <span className="text-[15px] leading-relaxed text-neutral-800 transition-colors duration-300 group-hover:text-white" style={body}>
          {typeof c.value === "string" ? c.value : t(c.value)}
        </span>
      </Body>
      {c.copy && (
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(c.copy!).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            });
          }}
          className={`mx-6 mb-6 inline-flex items-center gap-1.5 self-start rounded-full border border-[#0B6477]/15 px-3 py-1 text-[12px] text-[#0B6477] transition-colors group-hover:border-white/20 group-hover:text-white/80 hover:!bg-white/10`}
          style={body}
          aria-label={t({ en: `Copy ${label.toLowerCase()}`, id: `Salin ${label.toLowerCase()}` })}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t({ en: "Copied", id: "Tersalin" }) : t({ en: "Copy", id: "Salin" })}
        </button>
      )}
    </motion.div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#0B6477]/20 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/30 transition-colors";

const labelClass = "text-sm font-medium text-neutral-700";

// Optional follow-up questions per research area, shown only after the
// visitor picks an area, and all of them optional. `key` and the English
// option text are what gets stored and sent to the team's sheet; `name` is
// the row label shown in the review, PDF, and email draft.
type ExtraField = {
  key: string;
  name: Bi;
  label: Bi;
  type: "text" | "select";
  options?: Bi[];
  placeholder?: Bi;
};

const NOT_SURE: Bi = { en: "Not sure yet", id: "Belum yakin" };

const AREA_EXTRAS: Record<string, ExtraField[]> = {
  "Open Field Technology": [
    {
      key: "Crop type",
      name: { en: "Crop type", id: "Jenis tanaman" },
      label: { en: "What crop do you grow?", id: "Tanaman apa yang Anda budidayakan?" },
      type: "text",
      placeholder: { en: "e.g. rice, maize, shallots", id: "mis. padi, jagung, bawang merah" },
    },
    {
      key: "Land size",
      name: { en: "Land size", id: "Luas lahan" },
      label: { en: "Roughly how large is the land?", id: "Kira-kira berapa luas lahannya?" },
      type: "text",
      placeholder: { en: "e.g. 2 ha", id: "mis. 2 ha" },
    },
  ],
  "Irrigation Modernization": [
    {
      key: "Irrigation type",
      name: { en: "Irrigation type", id: "Jenis irigasi" },
      label: { en: "What kind of irrigation system?", id: "Sistem irigasi seperti apa?" },
      type: "select",
      options: [
        { en: "Canal network", id: "Jaringan saluran" },
        { en: "Pump-based", id: "Berbasis pompa" },
        { en: "Drip", id: "Irigasi tetes" },
        { en: "Sprinkler", id: "Sprinkler" },
        NOT_SURE,
      ],
    },
    {
      key: "Area served",
      name: { en: "Area served", id: "Luas layanan" },
      label: { en: "Roughly how large is the area served?", id: "Kira-kira berapa luas area yang dilayani?" },
      type: "text",
      placeholder: { en: "e.g. 150 ha", id: "mis. 150 ha" },
    },
  ],
  "Smart Estate Technology": [
    {
      key: "Commodity",
      name: { en: "Commodity", id: "Komoditas" },
      label: { en: "What commodity does the estate grow?", id: "Komoditas apa yang dibudidayakan di perkebunan?" },
      type: "select",
      options: [
        { en: "Oil palm", id: "Kelapa sawit" },
        { en: "Sugarcane", id: "Tebu" },
        { en: "Coffee", id: "Kopi" },
        { en: "Tea", id: "Teh" },
        { en: "Other", id: "Lainnya" },
      ],
    },
    {
      key: "Estate size",
      name: { en: "Estate size", id: "Luas perkebunan" },
      label: { en: "Roughly how large is the estate?", id: "Kira-kira berapa luas perkebunannya?" },
      type: "text",
      placeholder: { en: "e.g. 500 ha", id: "mis. 500 ha" },
    },
  ],
  "Smart UAV Technology": [
    {
      key: "Service needed",
      name: { en: "Service needed", id: "Layanan yang dibutuhkan" },
      label: { en: "What do you need the UAV for?", id: "Untuk apa Anda membutuhkan UAV?" },
      type: "select",
      options: [
        { en: "Field mapping", id: "Pemetaan lahan" },
        { en: "Crop monitoring", id: "Pemantauan tanaman" },
        { en: "Spraying", id: "Penyemprotan" },
        { en: "Training", id: "Pelatihan" },
        NOT_SURE,
      ],
    },
  ],
  "Indoor Farming Technology": [
    {
      key: "Facility type",
      name: { en: "Facility type", id: "Jenis fasilitas" },
      label: { en: "What kind of facility?", id: "Fasilitas seperti apa?" },
      type: "select",
      options: [
        { en: "Greenhouse", id: "Greenhouse" },
        { en: "Plant factory", id: "Plant factory" },
        { en: "Vertical farm", id: "Vertical farm" },
        { en: "Planning a new one", id: "Sedang merencanakan yang baru" },
      ],
    },
  ],
  "Agro-Informatics": [
    {
      key: "Data available",
      name: { en: "Data available", id: "Data yang tersedia" },
      label: { en: "What data do you already have?", id: "Data apa yang sudah Anda miliki?" },
      type: "select",
      options: [
        { en: "Sensor data", id: "Data sensor" },
        { en: "Drone/satellite imagery", id: "Citra drone/satelit" },
        { en: "Farm records", id: "Catatan usaha tani" },
        { en: "None yet", id: "Belum ada" },
      ],
    },
  ],
};

const EXTRA_FIELDS: Record<string, ExtraField> = Object.fromEntries(
  Object.values(AREA_EXTRAS)
    .flat()
    .map((field) => [field.key, field]),
);

// Extras are stored with English keys and option values (sent to the sheet as
// is); the review, PDF, and email draft show them in the visitor's language.
function extraRow(key: string, value: string, lang: Lang): { label: string; value: string } {
  const field = EXTRA_FIELDS[key];
  if (!field) return { label: key, value };
  const option = field.options?.find((o) => o.en === value);
  return { label: field.name[lang], value: option ? option[lang] : value };
}

type InquiryData = {
  name: string;
  email: string;
  organization: string;
  area: string;
  extras: Record<string, string>;
  techs: string[];
  question: string;
};

const EMPTY_INQUIRY: InquiryData = {
  name: "",
  email: "",
  organization: "",
  area: "",
  extras: {},
  techs: [],
  question: "",
};

function makeInquiryId() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SA-${ymd}-${rand}`;
}

function reviewRows(data: InquiryData, lang: Lang): { label: string; value: string }[] {
  const id = lang === "id";
  const rows = [
    { label: id ? "Nama" : "Name", value: data.name },
    { label: "Email", value: data.email },
    { label: id ? "Organisasi" : "Organization", value: data.organization },
    { label: id ? "Bidang riset" : "Research area", value: data.area ? areaLabel(data.area, lang) : "" },
    ...Object.entries(data.extras)
      .filter(([, value]) => value)
      .map(([key, value]) => extraRow(key, value, lang)),
    {
      label: id ? "Teknologi yang diminati" : "Technologies of interest",
      value: data.techs.map((tech) => techLabel(tech, lang)).join(", "),
    },
    { label: id ? "Pertanyaan" : "Question", value: data.question },
  ];
  return rows.filter((row) => row.value);
}

// The branded A4 letterhead (logo, URL, faint watermark, social handles) that
// sits behind the inquiry text on every page of the downloadable PDF.
const LETTERHEAD_URL = "/brand/letterhead.png";

async function loadDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadInquiryPdf(id: string, data: InquiryData, lang: Lang) {
  const doc = new jsPDF(); // portrait A4, mm units: 210 x 297
  const rows = reviewRows(data, lang);
  const isId = lang === "id";

  // Load the letterhead and paint it as a full-page background; if it fails to
  // load, the PDF still generates on a plain white page.
  const letterhead = await loadDataUrl(LETTERHEAD_URL);
  const paintLetterhead = () => {
    if (letterhead) doc.addImage(letterhead, "PNG", 0, 0, 210, 297);
  };

  const LEFT = 22;
  const TEXT_WIDTH = 150;
  const TOP = 54; // below the letterhead's logo header
  const BOTTOM_LIMIT = 232; // above the watermark/social band

  paintLetterhead();
  let y = TOP;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(11, 100, 119);
  doc.text(isId ? "Ringkasan Pesan" : "Inquiry Summary", LEFT, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`${isId ? "ID pesan" : "Inquiry ID"}: ${id}`, LEFT, y);
  y += 5.5;
  doc.text(
    `${isId ? "Tanggal" : "Date"}: ${new Date().toLocaleDateString(localeOf(lang), { year: "numeric", month: "long", day: "numeric" })}`,
    LEFT,
    y,
  );
  y += 11;

  rows.forEach((row) => {
    const valueLines = doc.splitTextToSize(row.value, TEXT_WIDTH);
    const blockHeight = 5.5 + valueLines.length * 5.2 + 5;
    if (y + blockHeight > BOTTOM_LIMIT) {
      doc.addPage();
      paintLetterhead();
      y = TOP;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text(row.label, LEFT, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text(valueLines, LEFT, y);
    y += valueLines.length * 5.2 + 5;
  });

  y += 2;
  if (y > BOTTOM_LIMIT) {
    doc.addPage();
    paintLetterhead();
    y = TOP;
  }
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(
    isId ? "Simpan ID pesan ini untuk keperluan tindak lanjut." : "Please keep this Inquiry ID for follow-up.",
    LEFT,
    y,
  );

  doc.save(`smartagri-${isId ? "pesan" : "inquiry"}-${id}.pdf`);
}

function InquiryForm() {
  const t = useT();
  const lang = useLang();
  const [step, setStep] = useState<"form" | "review" | "sent">("form");
  const [data, setData] = useState<InquiryData>(EMPTY_INQUIRY);
  const [id, setId] = useState("");

  const set = (patch: Partial<InquiryData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setId((prev) => prev || makeInquiryId());
    setStep("review");
  }

  function toggleTech(label: string) {
    setData((prev) => ({
      ...prev,
      techs: prev.techs.includes(label)
        ? prev.techs.filter((t) => t !== label)
        : [...prev.techs, label],
    }));
  }

  function send() {
    const rows = reviewRows(data, lang);
    if (INQUIRY_ENDPOINT) {
      // Fire-and-forget POST to the Google Apps Script inbox (see
      // docs/setup/SETUP-INQUIRIES.md); no-cors because Apps Script doesn't set CORS.
      fetch(INQUIRY_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          id,
          name: data.name,
          email: data.email,
          organization: data.organization,
          area: data.area,
          details: Object.entries(data.extras)
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join("; "),
          technologies: data.techs.join(", "),
          question: data.question,
        }),
      }).catch(() => {});
    } else {
      const subject = t({
        en: `[${id}] Inquiry from ${data.name}`,
        id: `[${id}] Pesan dari ${data.name}`,
      });
      const bodyText = [
        `${t({ en: "Inquiry ID", id: "ID pesan" })}: ${id}`,
        "",
        ...rows.map((row) => `${row.label}: ${row.value}`),
      ].join("\n");
      setTimeout(() => {
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      }, 150);
    }
    setStep("sent");
  }

  if (step === "review" || step === "sent") {
    return (
      <div className="flex flex-col gap-5 p-7 md:p-9">
        <div>
          <h2
            className="text-2xl md:text-3xl font-semibold text-neutral-900"
            style={display}
          >
            {step === "review" ? (
              t({
                en: (
                  <>
                    Review your <span style={accent}>inquiry</span>
                  </>
                ),
                id: (
                  <>
                    Tinjau <span style={accent}>pesan</span> Anda
                  </>
                ),
              })
            ) : (
              t({
                en: (
                  <>
                    Thank <span style={accent}>you!</span>
                  </>
                ),
                id: (
                  <>
                    Terima <span style={accent}>kasih!</span>
                  </>
                ),
              })
            )}
          </h2>
          <p className="text-sm font-normal text-neutral-500 mt-2" style={body}>
            {step === "review"
              ? t({
                  en: "Check your answers below, then send, or download a copy first.",
                  id: "Periksa jawaban Anda di bawah, lalu kirim, atau unduh salinannya terlebih dahulu.",
                })
              : INQUIRY_ENDPOINT
                ? t({
                    en: "Your inquiry has been delivered to the smartagri team.",
                    id: "Pesan Anda telah diterima tim smartagri.",
                  })
                : t({
                    en: `Your email app should have opened with the inquiry ready to send. If it didn't, email us at ${CONTACT_EMAIL}.`,
                    id: `Aplikasi email Anda seharusnya terbuka dengan pesan yang siap dikirim. Jika tidak, kirim email ke ${CONTACT_EMAIL}.`,
                  })}
          </p>
        </div>

        <div className="rounded-2xl bg-[#08313A] px-5 py-4">
          <div
            className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/60"
            style={body}
          >
            {t({
              en: "Your inquiry ID, save it for follow-up",
              id: "ID pesan Anda, simpan untuk tindak lanjut",
            })}
          </div>
          <div
            className="text-xl sm:text-2xl font-semibold text-[#45DFB1] mt-1"
            style={display}
          >
            {id}
          </div>
        </div>

        <dl className="border-t border-neutral-200">
          {reviewRows(data, lang).map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-neutral-100"
            >
              <dt className="text-sm font-normal text-neutral-400" style={body}>
                {row.label}
              </dt>
              <dd
                className="text-sm font-normal text-neutral-800 min-w-0 break-words [overflow-wrap:anywhere] whitespace-pre-wrap"
                style={body}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-3">
          {step === "review" ? (
            <>
              <button
                onClick={send}
                className="inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                style={body}
              >
                <Send className="w-4 h-4" />
                {t({ en: "Send inquiry", id: "Kirim pesan" })}
              </button>
              <button
                onClick={() => downloadInquiryPdf(id, data, lang)}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-[#0B6477] text-[#0B6477] text-base font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
                style={body}
              >
                <Download className="w-4 h-4" />
                {t({ en: "Download PDF", id: "Unduh PDF" })}
              </button>
              <button
                onClick={() => setStep("form")}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl text-neutral-500 text-base font-medium hover:text-neutral-800 transition-colors"
                style={body}
              >
                <Pencil className="w-4 h-4" />
                {t({ en: "Edit answers", id: "Ubah jawaban" })}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => downloadInquiryPdf(id, data, lang)}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-[#0B6477] text-[#0B6477] text-base font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
                style={body}
              >
                <Download className="w-4 h-4" />
                {t({ en: "Download PDF copy", id: "Unduh salinan PDF" })}
              </button>
              <button
                onClick={() => {
                  setData(EMPTY_INQUIRY);
                  setId("");
                  setStep("form");
                }}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl text-neutral-500 text-base font-medium hover:text-neutral-800 transition-colors"
                style={body}
              >
                {t({ en: "Send another inquiry", id: "Kirim pesan lain" })}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const extras = data.area ? (AREA_EXTRAS[data.area] ?? []) : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-7 md:p-9">
      <h2
        className="text-2xl md:text-3xl font-semibold text-neutral-900"
        style={display}
      >
        {t({
          en: (
            <>
              Let's keep <span style={accent}>in touch</span>
            </>
          ),
          id: (
            <>
              Mari tetap <span style={accent}>terhubung</span>
            </>
          ),
        })}
      </h2>
      <p className="text-base font-normal text-neutral-500" style={body}>
        {t({
          en: "Do you have a question about our research? Are you a cooperative, business, or student with a project in mind? Write to us. Only the starred fields are required.",
          id: "Punya pertanyaan tentang riset kami? Anda koperasi, pelaku usaha, atau mahasiswa dengan rencana proyek? Tulis kepada kami. Hanya kolom bertanda bintang yang wajib diisi.",
        })}
      </p>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          {t({ en: "Your name *", id: "Nama Anda *" })}
        </span>
        <input
          required
          value={data.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={t({ en: "Full name", id: "Nama lengkap" })}
          className={inputClass}
          style={body}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          {t({ en: "Your email address *", id: "Alamat email Anda *" })}
        </span>
        <input
          type="email"
          required
          value={data.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder={t({ en: "you@example.com", id: "anda@contoh.com" })}
          className={inputClass}
          style={body}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          {t({ en: "Organization", id: "Organisasi" })}
        </span>
        <input
          value={data.organization}
          onChange={(e) => set({ organization: e.target.value })}
          placeholder={t({
            en: "Cooperative, company, or university (optional)",
            id: "Koperasi, perusahaan, atau universitas (opsional)",
          })}
          className={inputClass}
          style={body}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          {t({ en: "Which research area fits your question?", id: "Bidang riset mana yang sesuai dengan pertanyaan Anda?" })}{" "}
          <span className="font-normal text-neutral-400">{t({ en: "(optional)", id: "(opsional)" })}</span>
        </span>
        <select
          value={data.area}
          onChange={(e) => set({ area: e.target.value, extras: {} })}
          className={inputClass}
          style={body}
        >
          <option value="">{t({ en: "Not sure yet, just ask away", id: "Belum yakin, silakan tanyakan saja" })}</option>
          {RESEARCH_AREAS.map((area) => (
            <option key={area.label} value={area.label}>
              {areaLabel(area.label, lang)}
            </option>
          ))}
        </select>
      </label>

      {extras.map((field) => (
        <label key={field.key} className="flex flex-col gap-1.5">
          <span className={labelClass} style={body}>
            {t(field.label)}{" "}
            <span className="font-normal text-neutral-400">{t({ en: "(optional)", id: "(opsional)" })}</span>
          </span>
          {field.type === "select" ? (
            <select
              value={data.extras[field.key] ?? ""}
              onChange={(e) =>
                set({ extras: { ...data.extras, [field.key]: e.target.value } })
              }
              className={inputClass}
              style={body}
            >
              <option value="">{t({ en: "Choose…", id: "Pilih…" })}</option>
              {field.options!.map((option) => (
                <option key={option.en} value={option.en}>
                  {t(option)}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={data.extras[field.key] ?? ""}
              onChange={(e) =>
                set({ extras: { ...data.extras, [field.key]: e.target.value } })
              }
              placeholder={field.placeholder && t(field.placeholder)}
              className={inputClass}
              style={body}
            />
          )}
        </label>
      ))}

      <div className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          {t({ en: "Technologies you're curious about", id: "Teknologi yang ingin Anda ketahui" })}{" "}
          <span className="font-normal text-neutral-400">{t({ en: "(optional)", id: "(opsional)" })}</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {TECHNOLOGIES.map((tech) => {
            const selected = data.techs.includes(tech.label);
            return (
              <button
                type="button"
                key={tech.id}
                onClick={() => toggleTech(tech.label)}
                className={
                  selected
                    ? "rounded-full px-3 py-1.5 text-sm font-medium bg-[#0B6477] text-white transition-colors"
                    : "rounded-full px-3 py-1.5 text-sm font-medium border border-[#0B6477]/20 text-neutral-500 hover:border-[#0B6477] hover:text-[#0B6477] transition-colors"
                }
                style={body}
              >
                {techLabel(tech.label, lang)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          {t({ en: "Your question *", id: "Pertanyaan Anda *" })}
        </span>
        <textarea
          required
          rows={5}
          value={data.question}
          onChange={(e) => {
            set({ question: e.target.value });
            // Auto-grow so the whole question stays visible as it's typed.
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder={t({
            en: "Tell us what you'd like to know or build together",
            id: "Ceritakan apa yang ingin Anda ketahui atau bangun bersama kami",
          })}
          className={`${inputClass} resize-none overflow-hidden min-h-[140px]`}
          style={body}
        />
        <span className="text-xs font-normal text-neutral-400" style={body}>
          {t({
            en: "The box grows as you type, and you can use line breaks to organize your question into paragraphs.",
            id: "Kotak ini membesar saat Anda mengetik, dan Anda dapat menekan Enter untuk membagi pertanyaan menjadi beberapa paragraf.",
          })}
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          required
          className="mt-1 w-4 h-4 accent-[#0B6477]"
        />
        <span className="text-sm font-normal text-neutral-500" style={body}>
          {t({
            en: "I agree that smartagri may use the details above to respond to my question.",
            id: "Saya setuju smartagri menggunakan data di atas untuk menanggapi pertanyaan saya.",
          })}
        </span>
      </label>

      <button
        type="submit"
        className="self-start h-12 px-8 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-lg font-medium hover:bg-[#80ED99] transition-colors"
        style={body}
      >
        {t({ en: "Review & submit", id: "Tinjau & kirim" })}
      </button>
    </form>
  );
}

// Contact page: masthead, how an inquiry works with the map beside the
// inquiry form (the form itself is unchanged), then the four direct channels.
function ContactUsPage() {
  const t = useT();
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={4} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pt-12 md:px-12 md:pt-20">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[80px]"
                  style={display}
                >
                  <MaskLine delay={0}>{t({ en: "Come find us", id: "Temui kami" })}</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>{t({ en: "in the field.", id: "di lapangan." })}</span>
                  </MaskLine>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="max-w-[480px] text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  {t({
                    en: "Reach out to start a conversation, whether you're exploring a collaboration, piloting smartagri on your fields, or just curious about our work.",
                    id: "Hubungi kami untuk memulai percakapan, baik untuk menjajaki kolaborasi, mengujicobakan smartagri di lahan Anda, maupun sekadar ingin tahu tentang karya kami.",
                  })}
                </motion.p>
              </div>

            </section>

            {/* How it works + map | form */}
            <section className="mx-auto grid max-w-[1360px] gap-6 px-6 pb-16 pt-14 md:px-12 md:pb-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div className="flex flex-col gap-6 lg:sticky lg:top-28">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, ease: EASE }}
                  data-header-theme="dark"
                  className="relative overflow-clip rounded-[28px] bg-[#08313A] p-7 text-white md:p-9"
                >
                  <div className="pointer-events-none absolute -right-20 -top-20 h-[280px] w-[280px] rounded-full bg-[#14919B]/30 blur-3xl animate-wash-a" />
                  <p className={`relative flex items-center gap-2 text-[#45DFB1] ${META}`} style={body}>
                    <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
                    {t({ en: "How it works", id: "Cara kerjanya" })}
                  </p>
                  <h2 className="relative mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-4xl" style={display}>
                    {t({ en: "From your message", id: "Dari pesan Anda" })}{" "}
                    <span style={{ ...accent, color: "#80ED99" }}>{t({ en: "to our team.", id: "ke tim kami." })}</span>
                  </h2>
                  <ol className="relative mt-8 flex flex-col">
                    {flow.map((f, i) => (
                      <motion.li
                        key={f.title.en}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: EASE }}
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        {i < flow.length - 1 && (
                          <motion.span
                            aria-hidden="true"
                            className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px origin-top bg-[#45DFB1]/35"
                            initial={{ scaleY: 0 }}
                            whileInView={{ scaleY: 1 }}
                            viewport={{ once: true, amount: 0.6 }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: EASE }}
                          />
                        )}
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#45DFB1] text-[#08313A]">
                          <f.icon className="h-4 w-4" />
                        </span>
                        <span style={body}>
                          <span className="block text-[17px] font-medium" style={display}>
                            {t(f.title)}
                          </span>
                          <span className="mt-1 block text-[14px] leading-relaxed text-white/70">{t(f.desc)}</span>
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: 0.1, duration: 0.7, ease: EASE }}
                  className="relative overflow-hidden rounded-[28px] border border-[#0B6477]/10 bg-white shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)]"
                >
                  {/* Google Maps embed (keyless): Faculty of Agricultural
                      Technology UGM (-7.7687041, 110.3806344) */}
                  <iframe
                    title={t({ en: "smartagri location map", id: "Peta lokasi smartagri" })}
                    src="https://www.google.com/maps?q=-7.7687041,110.3806344&z=17&output=embed"
                    className="h-[300px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="group absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#08313A]/85 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-[#08313A]"
                    style={body}
                  >
                    {t({ en: "Open in Google Maps", id: "Buka di Google Maps" })}
                    <ArrowUpRight className="h-4 w-4 transition-[rotate] duration-300 group-hover:rotate-45" />
                  </a>
                </motion.div>
              </div>

              <motion.div
                id="inquiry"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: 0.12, duration: 0.7, ease: EASE }}
                className="scroll-mt-28 rounded-[28px] border border-[#0B6477]/10 bg-white/95 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)] backdrop-blur"
              >
                <InquiryForm />
              </motion.div>
            </section>

            {/* Other ways to reach us */}
            <section className="mx-auto max-w-[1360px] px-6 pb-20 md:px-12 md:pb-28">
              <div className="border-t border-[#0B6477]/10 pt-14 md:pt-16">
                <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <motion.h2
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.6 }}
                    className="text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                    style={display}
                  >
                    <MaskLine delay={0}>{t({ en: "Prefer to reach us", id: "Ingin menghubungi kami" })}</MaskLine>
                    <MaskLine delay={0.1}>
                      <span style={accent}>{t({ en: "directly?", id: "secara langsung?" })}</span>
                    </MaskLine>
                  </motion.h2>
                  <p className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg" style={body}>
                    {t({
                      en: "Email or message us, or drop by the faculty during office hours.",
                      id: "Kirim email atau pesan kepada kami, atau mampirlah ke fakultas pada jam kerja.",
                    })}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {channels.map((c, i) => (
                    <ChannelCard key={c.label.en} c={c} index={i} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
