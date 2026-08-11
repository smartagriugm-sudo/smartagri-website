import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Gauge, Sprout } from "lucide-react";
import { A, indoorFarmingPhoto } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  IF_CAPABILITIES,
  IF_PILLARS,
  IF_PROCESS,
  IF_TROPICAL_POINTS,
} from "../lib/indoor-farming";
import { notes } from "../lib/notes";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import PhotoSlot from "../components/PhotoSlot";
import Footer from "../components/Footer";

export const Route = createFileRoute("/indoor-farming")({
  component: IndoorFarmingLanding,
  head: () => ({
    meta: [
      { title: "Indoor Farming | smartagri" },
      {
        name: "description",
        content:
          "Controlled-environment agriculture engineered for the tropics. Greenhouses, plant factories, climate and irrigation systems from the Smart Agriculture Research Center, Universitas Gadjah Mada.",
      },
    ],
  }),
});

function IndoorFarmingLanding() {
  const relatedNotes = notes.slice(0, 3);

  return (
    <main>
      <SiteHeader />
      <IndoorFarmingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#08313A]">
        <img
          src={A.indoorFarmingHero}
          alt="Greenhouse complex in a tropical highland valley"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08313A]/92 via-[#08313A]/75 to-[#08313A]/40" />
        <div className="relative max-w-[1360px] mx-auto px-6 md:px-12 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-[720px]"
          >
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#45DFB1] mb-4"
              style={body}
            >
              Indoor Farming · smartagri
            </div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.05] text-white"
              style={display}
            >
              Controlled environments,{" "}
              <span style={{ ...accent, color: "#45DFB1" }}>
                engineered for the tropics
              </span>
            </h1>
            <p
              className="mt-6 text-base md:text-lg font-normal text-white/75 leading-relaxed max-w-[600px]"
              style={body}
            >
              Greenhouses and plant factories designed for heat, humidity, and
              year-round pest pressure. Systems shaped by the climate we
              actually grow in.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/indoor-farming/$section"
                params={{ section: "technology" }}
                className="inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                style={body}
              >
                Explore the technology
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact-us"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-2xl border border-white/25 text-white text-base font-medium hover:bg-white/10 transition-colors"
                style={body}
              >
                Discuss a project
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Positioning */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start">
            <div>
              <div
                className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
                style={body}
              >
                Why we work on this
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900 max-w-[640px]"
                style={display}
              >
                Grow more, on less land, with far{" "}
                <span style={accent}>less water</span>
              </h2>
              <div
                className="mt-6 flex flex-col gap-4 text-base md:text-lg font-normal text-neutral-500 leading-relaxed max-w-[620px]"
                style={body}
              >
                <p>
                  Indonesia is losing farmland to cities while demand for clean,
                  consistent produce keeps climbing. Controlled-environment
                  agriculture answers both: it lifts yield per square metre,
                  recirculates its water, and produces to a schedule instead of
                  to the weather.
                </p>
                <p>
                  Doing that here means solving a tropical problem: shedding
                  heat and moisture, holding a stable vapour pressure deficit,
                  and keeping pests out all year. Our work at the Smart
                  Agriculture Research Center starts from those conditions, and
                  from hardware an Indonesian grower can afford, maintain, and
                  repair.
                </p>
              </div>
              <Link
                to="/research/$slug"
                params={{ slug: "indoor-farming-technology" }}
                className="mt-7 inline-flex items-center gap-1.5 text-[#0B6477] font-medium hover:underline"
                style={body}
              >
                See the research programme behind this
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <PhotoSlot
              src={indoorFarmingPhoto("overview.webp")}
              alt="Researchers working inside a smartagri greenhouse"
              icon={Sprout}
              caption="Photo: greenhouse interior"
              ratio="aspect-[4/3]"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-[680px] mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              Explore
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              Four ways into the <span style={accent}>subject</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {IF_PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
              >
                <Link
                  to="/indoor-farming/$section"
                  params={{ section: pillar.slug }}
                  className="group flex h-full flex-col gap-4 rounded-3xl border border-[#0B6477]/10 bg-white p-7 transition-colors hover:border-[#14919B]/40"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0B6477]/8 flex items-center justify-center">
                    <pillar.icon className="w-5 h-5 text-[#0B6477]" />
                  </div>
                  <h3
                    className="text-lg font-medium text-neutral-900"
                    style={display}
                  >
                    {pillar.label}
                  </h3>
                  <p
                    className="text-sm font-normal text-neutral-500 leading-relaxed flex-1"
                    style={body}
                  >
                    {pillar.blurb}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0B6477]"
                    style={body}
                  >
                    Read more
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pb-4 md:pb-8">
          <Link
            to="/indoor-farming/dashboard"
            className="group flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-[#0B6477]/10 bg-[#F3F7F6] p-8 md:p-10 transition-colors hover:border-[#14919B]/40"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white flex items-center justify-center">
                <Gauge className="w-5 h-5 text-[#0B6477]" />
              </div>
              <div>
                <div
                  className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-2"
                  style={body}
                >
                  Live demo
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900"
                  style={display}
                >
                  See the control{" "}
                  <span style={accent}>dashboard</span>
                </h2>
                <p
                  className="mt-3 text-base font-normal text-neutral-500 leading-relaxed max-w-[620px]"
                  style={body}
                >
                  Temperature, humidity, VPD, CO2, light, and the full nutrient
                  picture from our sensor stack, on one screen. Play a tropical
                  growing day through from midnight to midnight.
                </p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-2 h-12 px-7 shrink-0 rounded-2xl bg-[#45DFB1] text-[#0B2A22] text-base font-medium group-hover:bg-[#80ED99] transition-colors"
              style={body}
            >
              Open the dashboard
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* Tropical difference */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-[680px] mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              The tropical difference
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              What growing near the equator{" "}
              <span style={accent}>changes</span>
            </h2>
            <p
              className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed"
              style={body}
            >
              Four conditions define tropical growing, and between them they
              drive nearly every design decision we make.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {IF_TROPICAL_POINTS.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
                className="flex gap-4 rounded-3xl border border-[#0B6477]/10 bg-[#F3F7F6] p-7"
              >
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white flex items-center justify-center">
                  <point.icon className="w-5 h-5 text-[#14919B]" />
                </div>
                <div>
                  <h3
                    className="text-lg font-medium text-neutral-900 mb-2"
                    style={display}
                  >
                    {point.title}
                  </h3>
                  <p
                    className="text-sm font-normal text-neutral-500 leading-relaxed"
                    style={body}
                  >
                    {point.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-[#08313A]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
            <div>
              <div
                className="text-[13px] font-medium tracking-[0.03em] text-[#45DFB1] mb-3"
                style={body}
              >
                Capabilities
              </div>
              <h2
                className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-white"
                style={display}
              >
                What we bring to the{" "}
                <span style={{ ...accent, color: "#80ED99" }}>table</span>
              </h2>
              <p
                className="mt-5 text-base md:text-lg font-normal text-white/70 leading-relaxed max-w-[520px]"
                style={body}
              >
                Instrumentation, control, and crop science developed in our own
                greenhouses and plant factory, and taught to the people who will
                run yours.
              </p>
              <Link
                to="/technology"
                className="mt-7 inline-flex items-center gap-1.5 text-[#45DFB1] font-medium hover:underline"
                style={body}
              >
                All smartagri technology
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {IF_CAPABILITIES.map((cap) => (
                <div
                  key={cap.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
                >
                  <cap.icon className="w-5 h-5 shrink-0 text-[#45DFB1]" />
                  <span
                    className="text-sm font-normal text-white/85"
                    style={body}
                  >
                    {cap.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-[680px] mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              How we work together
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              From a question to a running{" "}
              <span style={accent}>facility</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {IF_PROCESS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
                className="rounded-3xl border border-[#0B6477]/10 bg-[#F3F7F6] p-7"
              >
                <div
                  className="text-sm font-semibold text-[#14919B] mb-4"
                  style={body}
                >
                  {step.step}
                </div>
                <h3
                  className="text-lg font-medium text-neutral-900 mb-2"
                  style={display}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm font-normal text-neutral-500 leading-relaxed"
                  style={body}
                >
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge preview */}
      {relatedNotes.length > 0 && (
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <div
                  className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
                  style={body}
                >
                  Knowledge
                </div>
                <h2
                  className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
                  style={display}
                >
                  From the <span style={accent}>field notes</span>
                </h2>
              </div>
              <Link
                to="/indoor-farming/knowledge"
                className="inline-flex items-center gap-1.5 text-[#0B6477] font-medium hover:underline"
                style={body}
              >
                All knowledge
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedNotes.map((note) => (
                <Link
                  key={note.slug}
                  to="/field-notes/$slug"
                  params={{ slug: note.slug }}
                  className="group flex flex-col gap-3 rounded-3xl border border-[#0B6477]/10 bg-white p-7 transition-colors hover:border-[#14919B]/40"
                >
                  <span
                    className="text-sm font-normal text-neutral-400"
                    style={body}
                  >
                    {note.date}
                  </span>
                  <h3
                    className="text-lg font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors"
                    style={display}
                  >
                    {note.title}
                  </h3>
                  <p
                    className="text-sm font-normal text-neutral-500 leading-relaxed line-clamp-3"
                    style={body}
                  >
                    {note.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-[#08313A] px-6 py-16 md:p-20 text-center flex flex-col items-center gap-6">
            <div className="pointer-events-none absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full bg-[#14919B]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 w-[360px] h-[360px] rounded-full bg-[#45DFB1]/20 blur-3xl" />
            <h2
              className="relative text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-white max-w-[720px]"
              style={display}
            >
              Thinking about growing under{" "}
              <span style={{ ...accent, color: "#80ED99" }}>cover?</span>
            </h2>
            <p
              className="relative text-base md:text-lg font-normal text-white/75 max-w-[560px]"
              style={body}
            >
              Tell us the crop, the site, and what you are trying to achieve. We
              will tell you honestly whether a controlled environment is the
              right answer, and what it would take.
            </p>
            <Link
              to="/contact-us"
              className="relative inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
              style={body}
            >
              Start a conversation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
