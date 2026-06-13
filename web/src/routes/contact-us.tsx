import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Download, Mail, MapPin, Pencil, Phone, Send } from "lucide-react";
import { jsPDF } from "jspdf";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";
import { TECHNOLOGIES } from "../lib/technology";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/contact-us")({
  component: ContactUsPage,
  head: () => ({
    meta: [
      {
        title: "Contact Us — smartagri",
      },
      {
        name: "description",
        content:
          "Get in touch with the Smart Agriculture Research Center — ask a question, explore a collaboration, or visit us in Sleman, Yogyakarta.",
      },
    ],
  }),
});

const CONTACT_EMAIL = "hello@smartagri.id";

// Google Apps Script Web App that appends submissions to the team's
// "smartagri — Inquiries" Google Sheet (see SETUP-INQUIRIES.md).
const INQUIRY_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxj-2d-hmXocr7OEag-oNrTy0yo3vUV40-DcmWx7K90ci9Lzol9iby6hcSyrT66k_M/exec";

const contactInfo = [
  {
    icon: MapPin,
    label: "Address",
    value:
      "Jl. Flora Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281",
  },
  {
    icon: Mail,
    label: "Email",
    value: CONTACT_EMAIL,
  },
  {
    icon: Phone,
    label: "Phone",
    // TODO: placeholder number — replace when the official line is provided
    value: "+62 274 000 0000",
  },
  {
    icon: Clock,
    label: "Office hours",
    value: "Monday–Friday, 08.00–16.00 WIB",
  },
];

const inputClass =
  "w-full rounded-xl border border-[#0B6477]/20 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/30 transition-colors";

const labelClass = "text-sm font-medium text-neutral-700";

// Optional follow-up questions per research area — shown only after the
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
  "Modernization Irrigation": [
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

function downloadInquiryPdf(id: string, data: InquiryData) {
  const doc = new jsPDF();
  const rows = reviewRows(data);
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(11, 100, 119);
  doc.text("smartagri — Inquiry Summary", 20, y);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Inquiry ID: ${id}`, 20, y);
  y += 6;
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    20,
    y,
  );
  y += 10;
  rows.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(row.label, 20, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    const lines = doc.splitTextToSize(row.value, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5.5 + 4;
    if (y > 270) {
      doc.addPage();
      y = 22;
    }
  });
  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Keep this ID for follow-up. Smart Agriculture Research Center UGM — ${CONTACT_EMAIL}`,
    20,
    Math.min(y, 285),
  );
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
              ? "Check your answers below, then send — or download a copy first."
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
            Your inquiry ID — save it for follow-up
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
              className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-neutral-100"
            >
              <dt className="text-sm font-normal text-neutral-400" style={body}>
                {row.label}
              </dt>
              <dd className="text-sm font-normal text-neutral-800" style={body}>
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
        business, or student with a project in mind? Write to us — only the
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
          <option value="">Not sure yet — just ask away</option>
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
          onChange={(e) => set({ question: e.target.value })}
          placeholder="Tell us what you'd like to know or build together"
          className={`${inputClass} resize-y`}
          style={body}
        />
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

function ContactUsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Contact Us"
            title={
              <>
                Come find us <span style={accent}>in the field</span>
              </>
            }
            subtitle="Reach out to start a conversation — whether you're exploring a collaboration, piloting smartagri on your fields, or just curious about our work."
          />

          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="flex flex-col gap-6"
            >
              <div className="rounded-3xl overflow-hidden border border-[#0B6477]/10 bg-white flex-1 min-h-[320px] relative">
                {/* Google Maps embed (keyless) — Faculty of Agricultural
                    Technology UGM (-7.7687041, 110.3806344) */}
                <iframe
                  title="smartagri location map"
                  src="https://www.google.com/maps?q=-7.7687041,110.3806344&z=17&output=embed"
                  className="w-full h-full min-h-[320px] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href="https://www.google.com/maps/search/?api=1&query=-7.7687041%2C110.3806344"
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 rounded-full bg-[#08313A]/85 backdrop-blur px-4 py-2 text-sm font-medium text-white hover:bg-[#08313A] transition-colors"
                  style={body}
                >
                  Open in Google Maps
                </a>
              </div>
              <div className="rounded-3xl bg-[#08313A] p-7 grid sm:grid-cols-2 gap-5">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="w-5 h-5 text-[#45DFB1] mt-0.5 shrink-0" />
                    <div>
                      <div
                        className="text-[13px] font-medium tracking-[0.03em] text-white/50"
                        style={body}
                      >
                        {item.label}
                      </div>
                      <div
                        className="text-sm font-normal text-white/85 leading-relaxed"
                        style={body}
                      >
                        {item.label === "Email" ? (
                          <a
                            href={`mailto:${item.value}`}
                            className="hover:text-white transition-colors"
                          >
                            {item.value}
                          </a>
                        ) : (
                          item.value
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
              className="rounded-3xl bg-white border border-[#0B6477]/10"
            >
              <InquiryForm />
            </motion.div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
