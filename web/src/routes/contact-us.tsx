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
import { RESEARCH_AREAS } from "../lib/research";
import { TECHNOLOGIES } from "../lib/technology";
import AmbientWash from "../components/AmbientWash";
import { EASE, MaskLine, META } from "../components/NoteParts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/contact-us")({
  component: ContactUsPage,
  head: () => ({
    meta: [
      {
        title: "Contact Us | smartagri",
      },
      {
        name: "description",
        content:
          "Get in touch with the Smart Agriculture Research Center: ask a question, explore a collaboration, or visit us in Sleman, Yogyakarta.",
      },
    ],
  }),
});

const CONTACT_EMAIL = "hello@smart-agri.id";

// Google Apps Script Web App that appends submissions to the team's
// "smartagri Inquiries" Google Sheet (see SETUP-INQUIRIES.md).
const INQUIRY_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxj-2d-hmXocr7OEag-oNrTy0yo3vUV40-DcmWx7K90ci9Lzol9iby6hcSyrT66k_M/exec";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=-7.7687041%2C110.3806344";

type Channel = {
  icon: typeof Mail;
  label: string;
  value: string;
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
    label: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    copy: CONTACT_EMAIL,
    // Envelope flies off and comes back: sent.
    move: { x: [0, 12, -12, 0], y: [0, -12, 12, 0], opacity: [1, 0, 0, 1], transition: { duration: 0.7, times: [0, 0.4, 0.41, 1] } },
  },
  {
    icon: Phone,
    label: "WhatsApp",
    value: "+62 851-1122-0365",
    href: "https://wa.me/6285111220365",
    external: true,
    copy: "+6285111220365",
    // Phone ringing.
    move: { rotate: [0, -16, 16, -12, 12, -6, 0], transition: { duration: 0.6 } },
  },
  {
    icon: MapPin,
    label: "Address",
    value:
      "Jl. Flora Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281",
    href: MAPS_URL,
    external: true,
    // Pin dropping onto the map.
    move: { y: [0, -6, 0, -2, 0], transition: { duration: 0.7 } },
  },
  {
    icon: Clock,
    label: "Office hours",
    value: "Monday–Friday, 08.00–16.00 WIB",
    // Clock hand going round.
    move: { rotate: [0, 360], transition: { duration: 0.9, ease: "easeInOut" } },
  },
];

// The inquiry flow, as the form below actually runs it.
const flow = [
  { icon: Pencil, title: "Fill in the form", desc: "Tell us who you are and what you need. Only the starred fields are required." },
  { icon: ClipboardCheck, title: "Review it", desc: "Check every answer on one screen and edit anything before it goes." },
  { icon: Send, title: "Send it", desc: "Your inquiry goes straight to the smartagri team." },
  { icon: FileText, title: "Keep your ID", desc: "You get an inquiry ID and can download a PDF summary for follow-up." },
];

function ChannelCard({ c, index }: { c: Channel; index: number }) {
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
          {c.label}
        </span>
        <span className="text-[15px] leading-relaxed text-neutral-800 transition-colors duration-300 group-hover:text-white" style={body}>
          {c.value}
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
          aria-label={`Copy ${c.label.toLowerCase()}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </motion.div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#0B6477]/20 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/30 transition-colors";

const labelClass = "text-sm font-medium text-neutral-700";

// Optional follow-up questions per research area, shown only after the
// visitor picks an area, and all of them optional.
type ExtraField = {
  key: string;
  label: string;
  type: "text" | "select";
  options?: string[];
  placeholder?: string;
};

const AREA_EXTRAS: Record<string, ExtraField[]> = {
  "Open Field Technology": [
    { key: "Crop type", label: "What crop do you grow?", type: "text", placeholder: "e.g. rice, maize, shallots" },
    { key: "Land size", label: "Roughly how large is the land?", type: "text", placeholder: "e.g. 2 ha" },
  ],
  "Irrigation Modernization": [
    {
      key: "Irrigation type",
      label: "What kind of irrigation system?",
      type: "select",
      options: ["Canal network", "Pump-based", "Drip", "Sprinkler", "Not sure yet"],
    },
    { key: "Area served", label: "Roughly how large is the area served?", type: "text", placeholder: "e.g. 150 ha" },
  ],
  "Smart Estate Technology": [
    {
      key: "Commodity",
      label: "What commodity does the estate grow?",
      type: "select",
      options: ["Oil palm", "Sugarcane", "Coffee", "Tea", "Other"],
    },
    { key: "Estate size", label: "Roughly how large is the estate?", type: "text", placeholder: "e.g. 500 ha" },
  ],
  "Smart UAV Technology": [
    {
      key: "Service needed",
      label: "What do you need the UAV for?",
      type: "select",
      options: ["Field mapping", "Crop monitoring", "Spraying", "Training", "Not sure yet"],
    },
  ],
  "Indoor Farming Technology": [
    {
      key: "Facility type",
      label: "What kind of facility?",
      type: "select",
      options: ["Greenhouse", "Plant factory", "Vertical farm", "Planning a new one"],
    },
  ],
  "Agro-Informatics": [
    {
      key: "Data available",
      label: "What data do you already have?",
      type: "select",
      options: ["Sensor data", "Drone/satellite imagery", "Farm records", "None yet"],
    },
  ],
};

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

function reviewRows(data: InquiryData): { label: string; value: string }[] {
  const rows = [
    { label: "Name", value: data.name },
    { label: "Email", value: data.email },
    { label: "Organization", value: data.organization },
    { label: "Research area", value: data.area },
    ...Object.entries(data.extras)
      .filter(([, value]) => value)
      .map(([key, value]) => ({ label: key, value })),
    { label: "Technologies of interest", value: data.techs.join(", ") },
    { label: "Question", value: data.question },
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

async function downloadInquiryPdf(id: string, data: InquiryData) {
  const doc = new jsPDF(); // portrait A4, mm units: 210 x 297
  const rows = reviewRows(data);

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
  doc.text("Inquiry Summary", LEFT, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Inquiry ID: ${id}`, LEFT, y);
  y += 5.5;
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
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
  doc.text("Please keep this Inquiry ID for follow-up.", LEFT, y);

  doc.save(`smartagri-inquiry-${id}.pdf`);
}

function InquiryForm() {
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
    const rows = reviewRows(data);
    if (INQUIRY_ENDPOINT) {
      // Fire-and-forget POST to the Google Apps Script inbox (see
      // SETUP-INQUIRIES.md); no-cors because Apps Script doesn't set CORS.
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
      const subject = `[${id}] Inquiry from ${data.name}`;
      const bodyText = [
        `Inquiry ID: ${id}`,
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
              <>
                Review your <span style={accent}>inquiry</span>
              </>
            ) : (
              <>
                Thank <span style={accent}>you!</span>
              </>
            )}
          </h2>
          <p className="text-sm font-normal text-neutral-500 mt-2" style={body}>
            {step === "review"
              ? "Check your answers below, then send, or download a copy first."
              : INQUIRY_ENDPOINT
                ? "Your inquiry has been delivered to the smartagri team."
                : "Your email app should have opened with the inquiry ready to send. If it didn't, email us at " +
                  CONTACT_EMAIL +
                  "."}
          </p>
        </div>

        <div className="rounded-2xl bg-[#08313A] px-5 py-4">
          <div
            className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/60"
            style={body}
          >
            Your inquiry ID, save it for follow-up
          </div>
          <div
            className="text-xl sm:text-2xl font-semibold text-[#45DFB1] mt-1"
            style={display}
          >
            {id}
          </div>
        </div>

        <dl className="border-t border-neutral-200">
          {reviewRows(data).map((row) => (
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
                Send inquiry
              </button>
              <button
                onClick={() => downloadInquiryPdf(id, data)}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-[#0B6477] text-[#0B6477] text-base font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
                style={body}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={() => setStep("form")}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl text-neutral-500 text-base font-medium hover:text-neutral-800 transition-colors"
                style={body}
              >
                <Pencil className="w-4 h-4" />
                Edit answers
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => downloadInquiryPdf(id, data)}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-[#0B6477] text-[#0B6477] text-base font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
                style={body}
              >
                <Download className="w-4 h-4" />
                Download PDF copy
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
                Send another inquiry
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
        Let's keep <span style={accent}>in touch</span>
      </h2>
      <p className="text-base font-normal text-neutral-500" style={body}>
        Do you have a question about our research? Are you a cooperative,
        business, or student with a project in mind? Write to us. Only the
        starred fields are required.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          Your name *
        </span>
        <input
          required
          value={data.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Full name"
          className={inputClass}
          style={body}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          Your email address *
        </span>
        <input
          type="email"
          required
          value={data.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="you@example.com"
          className={inputClass}
          style={body}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          Organization
        </span>
        <input
          value={data.organization}
          onChange={(e) => set({ organization: e.target.value })}
          placeholder="Cooperative, company, or university (optional)"
          className={inputClass}
          style={body}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          Which research area fits your question?{" "}
          <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <select
          value={data.area}
          onChange={(e) => set({ area: e.target.value, extras: {} })}
          className={inputClass}
          style={body}
        >
          <option value="">Not sure yet, just ask away</option>
          {RESEARCH_AREAS.map((area) => (
            <option key={area.label} value={area.label}>
              {area.label}
            </option>
          ))}
        </select>
      </label>

      {extras.map((field) => (
        <label key={field.key} className="flex flex-col gap-1.5">
          <span className={labelClass} style={body}>
            {field.label}{" "}
            <span className="font-normal text-neutral-400">(optional)</span>
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
              <option value="">Choose…</option>
              {field.options!.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={data.extras[field.key] ?? ""}
              onChange={(e) =>
                set({ extras: { ...data.extras, [field.key]: e.target.value } })
              }
              placeholder={field.placeholder}
              className={inputClass}
              style={body}
            />
          )}
        </label>
      ))}

      <div className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          Technologies you're curious about{" "}
          <span className="font-normal text-neutral-400">(optional)</span>
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
                {tech.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass} style={body}>
          Your question *
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
          placeholder="Tell us what you'd like to know or build together"
          className={`${inputClass} resize-none overflow-hidden min-h-[140px]`}
          style={body}
        />
        <span className="text-xs font-normal text-neutral-400" style={body}>
          The box grows as you type, and you can use line breaks to organize
          your question into paragraphs.
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          required
          className="mt-1 w-4 h-4 accent-[#0B6477]"
        />
        <span className="text-sm font-normal text-neutral-500" style={body}>
          I agree that smartagri may use the details above to respond to my
          question.
        </span>
      </label>

      <button
        type="submit"
        className="self-start h-12 px-8 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-lg font-medium hover:bg-[#80ED99] transition-colors"
        style={body}
      >
        Review & submit
      </button>
    </form>
  );
}

// Contact page: masthead, how an inquiry works with the map beside the
// inquiry form (the form itself is unchanged), then the four direct channels.
function ContactUsPage() {
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
                  <MaskLine delay={0}>Come find us</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>in the field.</span>
                  </MaskLine>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="max-w-[480px] text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  Reach out to start a conversation, whether you're exploring a collaboration,
                  piloting smartagri on your fields, or just curious about our work.
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
                    How it works
                  </p>
                  <h2 className="relative mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-4xl" style={display}>
                    From your message <span style={{ ...accent, color: "#80ED99" }}>to our team.</span>
                  </h2>
                  <ol className="relative mt-8 flex flex-col">
                    {flow.map((f, i) => (
                      <motion.li
                        key={f.title}
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
                            {f.title}
                          </span>
                          <span className="mt-1 block text-[14px] leading-relaxed text-white/70">{f.desc}</span>
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
                    title="smartagri location map"
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
                    Open in Google Maps
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
                    <MaskLine delay={0}>Prefer to reach us</MaskLine>
                    <MaskLine delay={0.1}>
                      <span style={accent}>directly?</span>
                    </MaskLine>
                  </motion.h2>
                  <p className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg" style={body}>
                    Email or message us, or drop by the faculty during office hours.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {channels.map((c, i) => (
                    <ChannelCard key={c.label} c={c} index={i} />
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
