import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
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

function QuestionForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const organization = String(data.get("organization") ?? "");
    const question = String(data.get("question") ?? "");

    const subject = `Question from ${name} via smartagri.id`;
    const bodyText = [
      question,
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      organization ? `Organization: ${organization}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // No backend — hand the message to the visitor's email app. Show the
    // success state first so the page responds even if the mail prompt is
    // dismissed or blocked.
    setSubmitted(true);
    setTimeout(() => {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    }, 150);
  }

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-10">
        <div
          className="text-2xl md:text-3xl font-semibold text-neutral-900"
          style={display}
        >
          Thank you for your message.
        </div>
        <p
          className="text-base font-normal text-neutral-500 max-w-[380px]"
          style={body}
        >
          Your email app should have opened with the message ready to send. If
          it didn't, email us directly at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#0B6477] font-medium">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-[#0B6477] font-medium hover:underline"
          style={body}
        >
          Send another question
        </button>
      </div>
    );
  }

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
        business, or student with a project in mind? Write to us.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700" style={body}>
          Your name *
        </span>
        <input
          name="name"
          required
          placeholder="Full name"
          className={inputClass}
          style={body}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700" style={body}>
          Your email address *
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className={inputClass}
          style={body}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700" style={body}>
          Organization
        </span>
        <input
          name="organization"
          placeholder="Cooperative, company, or university (optional)"
          className={inputClass}
          style={body}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700" style={body}>
          Your question *
        </span>
        <textarea
          name="question"
          required
          rows={5}
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
          question. Submitting opens your email app — nothing is stored on this
          site.
        </span>
      </label>
      <button
        type="submit"
        className="self-start h-12 px-8 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-lg font-medium hover:bg-[#80ED99] transition-colors"
        style={body}
      >
        Submit
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
                  allowFullScreen
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
              <QuestionForm />
            </motion.div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
