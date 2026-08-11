import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Download,
  Gauge,
  Radio,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { indoorDashboardImage } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  DASHBOARD_STACK,
  METRICS,
  ROOT_KEYS,
} from "../lib/indoor-dashboard";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import IndoorDashboard from "../components/IndoorDashboard";
import PhotoSlot from "../components/PhotoSlot";
import Footer from "../components/Footer";

export const Route = createFileRoute("/indoor-farming_/dashboard")({
  component: IndoorFarmingDashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard · Indoor Farming | smartagri" },
      {
        name: "description",
        content:
          "A live demo of the smartagri controlled-environment dashboard: air temperature, humidity, VPD, CO2, PPFD and DLI, pH, EC, dissolved oxygen, nutrient temperature, and an outdoor weather station, in one screen.",
      },
    ],
  }),
});

// Why the demo runs on simulated data, stated plainly on the page as well as
// here: the research facility is not exposed to the public internet, and a
// promotional page that silently invents live readings would be dishonest. The
// simulation is physically grounded (see lib/indoor-dashboard.ts) so what a
// visitor sees is the real shape of a tropical growing day.

function IndoorFarmingDashboardPage() {
  return (
    <main>
      <SiteHeader />
      <IndoorFarmingNav />

      {/* Intro */}
      <section className="bg-white border-b border-[#0B6477]/10">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-10 md:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              Dashboard
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-neutral-900 max-w-[880px]"
              style={display}
            >
              Every sensor we build, reporting to{" "}
              <span style={accent}>one screen</span>
            </h1>
            <p
              className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed max-w-[720px]"
              style={body}
            >
              Climate, light, and nutrient instrumentation from our own
              greenhouses and plant factory, brought together in a single
              control view. Switch zones, switch parameters, and watch a
              tropical growing day play out.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/contact-us"
                className="inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                style={body}
              >
                Request a walkthrough
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/technology"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-2xl border border-[#0B6477]/20 text-[#0B6477] text-base font-medium hover:bg-[#F3F7F6] transition-colors"
                style={body}
              >
                The instrumentation behind it
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The dashboard itself */}
      <section className="relative overflow-hidden bg-[#08313A]">
        <div className="pointer-events-none absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full bg-[#14919B]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 -left-32 w-[520px] h-[520px] rounded-full bg-[#45DFB1]/15 blur-3xl" />
        <div className="relative max-w-[1360px] mx-auto px-4 sm:px-6 md:px-12 py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <div
                className="text-[13px] font-medium tracking-[0.03em] text-[#45DFB1] mb-2"
                style={body}
              >
                Live demo
              </div>
              <h2
                className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-white"
                style={display}
              >
                A day in a tropical{" "}
                <span style={{ ...accent, color: "#80ED99" }}>growing house</span>
              </h2>
            </div>
            <p
              className="text-sm font-normal text-white/60 leading-relaxed max-w-[420px]"
              style={body}
            >
              The clock advances on its own. Pause it, pick a different zone, or
              switch the chart to another parameter to see how the readings move
              together.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <IndoorDashboard />
          </motion.div>

          <p
            className="mt-5 text-xs font-normal text-white/45 leading-relaxed max-w-[720px]"
            style={body}
          >
            Demonstration data. The readings are generated from physical models
            of a tropical growing day, not streamed from the research facility.
            Vapour pressure deficit is computed from the air temperature and
            humidity shown beside it, and the daily light integral is the
            running integral of PPFD, so the relationships between parameters
            behave exactly as they do in a real house.
          </p>
        </div>
      </section>

      {/* Parameters we track */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-[680px] mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              Parameters
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              What we measure, and why it{" "}
              <span style={accent}>earns its place</span>
            </h2>
            <p
              className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed"
              style={body}
            >
              A dashboard is only worth the decisions it changes. Each parameter
              below is on the screen because a grower acts on it, not because
              the sensor was cheap to add.
            </p>
          </div>

          {[
            {
              heading: "Aerial environment",
              caption: "What the canopy is breathing, feeling, and being lit by.",
              keys: AERIAL_KEYS,
            },
            {
              heading: "Root zone",
              caption: "The nutrient side, measured inline rather than by hand once a day.",
              keys: ROOT_KEYS,
            },
          ].map((group) => (
            <div key={group.heading} className="mb-10 last:mb-0">
              <div className="flex flex-wrap items-baseline gap-3 mb-5">
                <h3
                  className="text-xl font-medium text-neutral-900"
                  style={display}
                >
                  {group.heading}
                </h3>
                <span className="text-sm font-normal text-neutral-400" style={body}>
                  {group.caption}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.keys.map((key, i) => {
                  const m = METRICS[key];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{
                        delay: Math.min(i, 5) * 0.05,
                        duration: 0.45,
                        ease: "easeOut",
                      }}
                      className="flex flex-col gap-3 rounded-3xl border border-[#0B6477]/10 bg-[#F3F7F6] p-6"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"
                          style={{ color: m.tone }}
                        >
                          <m.icon className="w-5 h-5" />
                        </span>
                        <span
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-500 tabular-nums"
                          style={body}
                        >
                          {m.optimal[0]} to {m.optimal[1]} {m.unit}
                        </span>
                      </div>
                      <h4
                        className="text-base font-medium text-neutral-900"
                        style={display}
                      >
                        {m.label}
                        {m.unit && (
                          <span className="ml-1.5 text-sm font-normal text-neutral-400">
                            {m.unit}
                          </span>
                        )}
                      </h4>
                      <p
                        className="text-sm font-normal text-neutral-500 leading-relaxed flex-1"
                        style={body}
                      >
                        {m.why}
                      </p>
                      <p
                        className="text-xs font-normal text-neutral-400 leading-relaxed border-t border-[#0B6477]/10 pt-3"
                        style={body}
                      >
                        {m.sensor}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The stack */}
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-16 items-start">
            <div>
              <div
                className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
                style={body}
              >
                What is plugged in
              </div>
              <h2
                className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900 max-w-[560px]"
                style={display}
              >
                Instruments we built, and{" "}
                <span style={accent}>maintain ourselves</span>
              </h2>
              <p
                className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed max-w-[560px]"
                style={body}
              >
                The dashboard is the visible end of a stack that starts at the
                probe. Everything on it is running in our own facility, which is
                where the calibration routines and failure modes were learned.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {DASHBOARD_STACK.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{
                      delay: i * 0.06,
                      duration: 0.45,
                      ease: "easeOut",
                    }}
                    className="rounded-3xl border border-[#0B6477]/10 bg-white p-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0B6477]/8 flex items-center justify-center mb-4">
                      <item.icon className="w-5 h-5 text-[#0B6477]" />
                    </div>
                    <h3
                      className="text-base font-medium text-neutral-900 mb-2"
                      style={display}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm font-normal text-neutral-500 leading-relaxed mb-4"
                      style={body}
                    >
                      {item.body}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {item.points.map((point) => (
                        <li
                          key={point}
                          className="flex gap-2 text-sm font-normal text-neutral-500 leading-relaxed"
                          style={body}
                        >
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#45DFB1]" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-[132px]">
              <PhotoSlot
                src={indoorDashboardImage("sensor-node.webp")}
                alt="Sensor node mounted at canopy height inside a greenhouse"
                icon={Radio}
                caption="Photo: canopy sensor node"
                ratio="aspect-[4/3]"
              />
              <PhotoSlot
                src={indoorDashboardImage("control-cabinet.webp")}
                alt="Control cabinet with the facility controller and dosing electronics"
                icon={Cpu}
                caption="Photo: control cabinet"
                ratio="aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it runs */}
      <section className="bg-[#08313A]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-[680px] mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#45DFB1] mb-3"
              style={body}
            >
              How it runs
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-white"
              style={display}
            >
              Designed for a house with an{" "}
              <span style={{ ...accent, color: "#80ED99" }}>unreliable connection</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Cpu,
                title: "Control stays local",
                body: "The controller holds the setpoints and keeps actuating whether or not the internet is up. The dashboard is a window onto it, not the thing keeping the crop alive.",
              },
              {
                icon: Wifi,
                title: "Buffered upload",
                body: "Readings are logged at full resolution on site and backfilled when the link returns, so a dropout leaves a gap in the view, never in the record.",
              },
              {
                icon: ShieldCheck,
                title: "Calibration is tracked",
                body: "Every probe carries its last calibration date and drift. A sensor past due is flagged on the screen rather than quietly trusted.",
              },
              {
                icon: Download,
                title: "The data is yours",
                body: "Full-resolution history exports as CSV for analysis in R, Python, or a spreadsheet. A trial should be writable from the log without asking us for it.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
                className="rounded-3xl border border-white/10 bg-white/5 p-7"
              >
                <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center mb-5">
                  <item.icon className="w-5 h-5 text-[#45DFB1]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2" style={display}>
                  {item.title}
                </h3>
                <p
                  className="text-sm font-normal text-white/65 leading-relaxed"
                  style={body}
                >
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-[#0B6477]/10 bg-[#F3F7F6] p-8 md:p-12">
            <div className="flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white flex items-center justify-center">
                <Gauge className="w-5 h-5 text-[#0B6477]" />
              </div>
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900"
                  style={display}
                >
                  Want this on your{" "}
                  <span style={accent}>own house?</span>
                </h2>
                <p
                  className="mt-3 text-base font-normal text-neutral-500 leading-relaxed max-w-[560px]"
                  style={body}
                >
                  Tell us what you are growing and what you already have
                  installed. We will tell you which parameters are worth
                  instrumenting first, and which ones can wait.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <Link
                to="/contact-us"
                className="inline-flex items-center justify-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                style={body}
              >
                Start a conversation
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/indoor-farming/$section"
                params={{ section: "technology" }}
                className="inline-flex items-center justify-center gap-1.5 text-[#0B6477] font-medium hover:underline"
                style={body}
              >
                Explore the technology
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
