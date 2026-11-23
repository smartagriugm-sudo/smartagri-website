import { useRef } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MotionConfig, motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { A, indoorDashboardImage, indoorFarmingPhoto } from "../lib/assets";
import { useAuth } from "../lib/auth/auth";
import { accent, body, display } from "../lib/fonts";
import {
  ifCapabilitiesFor,
  ifPillarsFor,
  ifProcessFor,
  ifTropicalPointsFor,
} from "../lib/indoor-farming";
import { IF_NOTES } from "../lib/indoor-farming-knowledge";
import { localizeNote, notes } from "../lib/notes";
import { headLang, useLang, useT } from "../lib/i18n";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { RevealPhoto } from "../components/ResearchPhotos";
import { EASE, MaskLine, NoteCard } from "../components/NoteParts";
import {
  Eyebrow,
  FeatureCard,
  ProcessSteps,
  SectionCard,
  fadeUp,
} from "../components/IndoorFarmingParts";

export const Route = createFileRoute("/indoor-farming")({
  component: IndoorFarmingLanding,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        { title: "Indoor Farming | smartagri" },
        {
          name: "description",
          content:
            l === "id"
              ? "Pertanian lingkungan terkendali yang dirancang untuk daerah tropis. Greenhouse, plant factory, serta sistem iklim dan irigasi dari Smart Agriculture Research Center, Universitas Gadjah Mada."
              : "Controlled-environment agriculture engineered for the tropics. Greenhouses, plant factories, climate and irrigation systems from the Smart Agriculture Research Center, Universitas Gadjah Mada.",
        },
      ],
    };
  },
});

// Indoor Farming overview: masthead over a wide greenhouse photo, why the
// center works on this, the four sections, the dashboard (signed-in only),
// what the tropics change, capabilities, how a collaboration runs, recent
// notes, and the landing call to action.

const TROPICAL_MOTION = ["wind", "sun", "bug", "rain"];

function SectionHeading({ first, second, dark = false }: { first: string; second: string; dark?: boolean }) {
  return (
    <motion.h2
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      className={`mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-5xl ${
        dark ? "text-white" : "text-neutral-900"
      }`}
      style={display}
    >
      <MaskLine delay={0}>{first}</MaskLine>
      <MaskLine delay={0.1}>
        <span style={dark ? { ...accent, color: "#80ED99" } : accent}>{second}</span>
      </MaskLine>
    </motion.h2>
  );
}

// Wide hero photo: wipes open on load, then drifts slower than the page.
function HeroPhoto() {
  const lang = useLang();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <motion.div
      ref={ref}
      initial={{ clipPath: "inset(12% 6% 0% 6% round 28px)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0% round 28px)" }}
      transition={{ delay: 0.35, duration: 1.3, ease: EASE }}
      className="relative mt-14 h-[320px] overflow-hidden rounded-[28px] bg-[#08313A] sm:h-[420px] md:h-[560px]"
    >
      <motion.img
        src={A.indoorFarmingHero}
        alt={t({ en: "Greenhouse complex in a tropical highland valley", id: "Kompleks greenhouse di lembah dataran tinggi tropis" })}
        style={{ y }}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1.12 }}
        transition={{ delay: 0.35, duration: 1.8, ease: EASE }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#08313A]/70 via-[#08313A]/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-5 md:p-8">
        {ifPillarsFor(lang).map((p, i) => (
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.08, duration: 0.6, ease: EASE }}
          >
            <Link
              to="/indoor-farming/$section"
              params={{ section: p.slug }}
              className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.08em] text-white backdrop-blur-md transition-colors hover:bg-[#45DFB1] hover:text-[#0B2A22]"
              style={body}
            >
              <p.icon className="h-3.5 w-3.5 text-[#45DFB1] transition-colors group-hover:text-[#0B2A22]" />
              {p.label}
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function DashboardPromo() {
  const t = useT();
  return (
    <motion.div {...fadeUp(0)}>
      <Link
        to="/indoor-farming/dashboard"
        data-header-theme="dark"
        className="group relative grid overflow-hidden rounded-[28px] bg-[#08313A] lg:grid-cols-2"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full bg-[#14919B]/30 blur-3xl" />
        <div className="relative flex flex-col justify-center p-8 md:p-12">
          <Eyebrow dark>
            <span className="relative mr-1 inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#45DFB1]/70" />
              <span className="relative h-2 w-2 rounded-full bg-[#45DFB1]" />
            </span>
            {t({ en: "Live demo", id: "Demo langsung" })}
          </Eyebrow>
          <h2
            className="mt-4 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-4xl"
            style={display}
          >
            {t({ en: "See the control", id: "Lihat" })}{" "}
            <span style={{ ...accent, color: "#80ED99" }}>{t({ en: "dashboard.", id: "dashboard kendali." })}</span>
          </h2>
          <p className="mt-4 max-w-[480px] text-base leading-relaxed text-white/70" style={body}>
            {t({
              en: "Temperature, humidity, VPD, CO2, light, and the full nutrient picture from our sensor stack, on one screen. Play a tropical growing day through from midnight to midnight.",
              id: "Suhu, kelembapan, VPD, CO2, cahaya, dan gambaran nutrisi lengkap dari rangkaian sensor kami, dalam satu layar. Putar satu hari tanam tropis dari tengah malam hingga tengah malam berikutnya.",
            })}
          </p>
          <span
            className="mt-8 inline-flex h-12 w-fit items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors group-hover:bg-[#80ED99]"
            style={body}
          >
            {t({ en: "Open the dashboard", id: "Buka dashboard" })}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
        <div className="relative min-h-[240px] overflow-hidden">
          <img
            src={indoorDashboardImage("promo-card.webp")}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08313A] via-[#08313A]/20 to-transparent lg:via-transparent" />
        </div>
      </Link>
    </motion.div>
  );
}

const chipList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const chipItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function IndoorFarmingLanding() {
  const lang = useLang();
  const t = useT();
  const relatedNotes = (IF_NOTES.length >= 3 ? IF_NOTES : notes)
    .slice(0, 3)
    .map((note) => localizeNote(note, lang));
  // Same rule as the sub-nav: do not advertise the gated dashboard to visitors
  // who cannot open it.
  const { user, isConfigured } = useAuth();
  const showDashboard = !isConfigured || !!user;

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader subnav={<IndoorFarmingNav />} />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={8} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pt-12 md:px-12 md:pt-16">
              <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px] lg:col-span-9"
                  style={display}
                >
                  <MaskLine delay={0}>
                    {t({ en: "Controlled environments,", id: "Lingkungan terkendali," })}
                  </MaskLine>
                  <MaskLine delay={0.12}>
                    {t({ en: "engineered", id: "dirancang" })}{" "}
                    <span style={accent}>{t({ en: "for the tropics.", id: "untuk tropis." })}</span>
                  </MaskLine>
                </motion.h1>
                <div className="lg:col-span-3">
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="text-base leading-relaxed text-neutral-600 md:text-lg"
                    style={body}
                  >
                    {t({
                      en: "Greenhouses and plant factories designed for heat, humidity, and year-round pest pressure. Systems shaped by the climate we actually grow in.",
                      id: "Greenhouse dan plant factory yang dirancang untuk panas, kelembapan, dan tekanan hama sepanjang tahun. Sistem yang dibentuk oleh iklim tempat kami benar-benar bertanam.",
                    })}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                    className="mt-6 flex flex-wrap items-center gap-5"
                  >
                    <Link
                      to="/contact-us"
                      hash="inquiry"
                      className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                      style={body}
                    >
                      {t({ en: "Start a project", id: "Mulai proyek" })}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/indoor-farming/$section"
                      params={{ section: "technology" }}
                      className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                      style={body}
                    >
                      {t({ en: "The technology", id: "Teknologinya" })}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                </div>
              </div>
              <HeroPhoto />
            </section>

            {/* Positioning */}
            <section className="mx-auto grid max-w-[1360px] gap-12 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-7 lg:pt-6">
                <Eyebrow>{t({ en: "Why we work on this", id: "Mengapa kami menggarap ini" })}</Eyebrow>
                <SectionHeading
                  first={t({ en: "Grow more, on less land,", id: "Panen lebih banyak di lahan lebih sempit," })}
                  second={t({ en: "with far less water.", id: "dengan air jauh lebih sedikit." })}
                />
                <motion.div
                  {...fadeUp(0.15)}
                  className="mt-8 flex max-w-[640px] flex-col gap-4 text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  <p>
                    {t({
                      en: "Indonesia is losing farmland to cities while demand for clean, consistent produce keeps climbing. Controlled-environment agriculture answers both: it lifts yield per square metre, recirculates its water, and produces to a schedule instead of to the weather.",
                      id: "Indonesia terus kehilangan lahan pertanian karena perluasan kota, sementara permintaan akan produk yang bersih dan konsisten terus naik. Pertanian lingkungan terkendali menjawab keduanya: hasil per meter persegi naik, airnya diresirkulasi, dan produksi mengikuti jadwal, bukan cuaca.",
                    })}
                  </p>
                  <p>
                    {t({
                      en: "Doing that here means solving a tropical problem: shedding heat and moisture, holding a stable vapour pressure deficit, and keeping pests out all year. Our work at the Smart Agriculture Research Center starts from those conditions, and from hardware an Indonesian grower can afford, maintain, and repair.",
                      id: "Mewujudkannya di sini berarti memecahkan masalah tropis: membuang panas dan uap air, menjaga defisit tekanan uap tetap stabil, dan menahan hama sepanjang tahun. Kerja kami di Smart Agriculture Research Center berangkat dari kondisi itu, dan dari perangkat keras yang terjangkau, bisa dirawat, dan bisa diperbaiki oleh petani Indonesia.",
                    })}
                  </p>
                </motion.div>
                <motion.div {...fadeUp(0.25)} className="mt-8">
                  <Link
                    to="/research/$slug"
                    params={{ slug: "indoor-farming-technology" }}
                    className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                    style={body}
                  >
                    {t({ en: "The research programme behind this", id: "Program riset di baliknya" })}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </div>
              <div className="lg:col-span-5">
                <RevealPhoto
                  src={indoorFarmingPhoto("overview.webp")}
                  side="right"
                  alt={t({ en: "Researchers working inside a smartagri greenhouse", id: "Peneliti bekerja di dalam greenhouse smartagri" })}
                />
              </div>
            </section>

            {/* The four sections */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <Eyebrow>{t({ en: "Explore", id: "Jelajahi" })}</Eyebrow>
                    <SectionHeading
                      first={t({ en: "Four ways into", id: "Empat pintu masuk" })}
                      second={t({ en: "the subject.", id: "ke topik ini." })}
                    />
                  </div>
                  <motion.p
                    {...fadeUp(0.2)}
                    className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg"
                    style={body}
                  >
                    {t({
                      en: "From the first feasibility questions to the crops, the systems, and the structures that house them.",
                      id: "Dari pertanyaan kelayakan pertama hingga tanaman, sistem, dan struktur yang menaunginya.",
                    })}
                  </motion.p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {ifPillarsFor(lang).map((pillar, i) => (
                    <motion.div
                      key={pillar.slug}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: i * 0.08, duration: 0.7, ease: EASE }}
                    >
                      <SectionCard {...pillar} />
                    </motion.div>
                  ))}
                </div>
                {showDashboard && (
                  <div className="mt-16">
                    <DashboardPromo />
                  </div>
                )}
              </div>
            </section>

            {/* What the tropics change */}
            <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
                <div className="lg:col-span-4">
                  <div className="lg:sticky lg:top-[160px]">
                    <Eyebrow>{t({ en: "The tropical difference", id: "Bedanya di tropis" })}</Eyebrow>
                    <SectionHeading
                      first={t({ en: "What the equator", id: "Apa yang diubah" })}
                      second={t({ en: "changes.", id: "khatulistiwa." })}
                    />
                    <motion.p
                      {...fadeUp(0.2)}
                      className="mt-6 text-base leading-relaxed text-neutral-500 md:text-lg"
                      style={body}
                    >
                      {t({
                        en: "Four conditions define tropical growing, and between them they drive nearly every design decision we make.",
                        id: "Empat kondisi mendefinisikan budidaya di daerah tropis, dan bersama-sama keempatnya mendorong hampir setiap keputusan desain yang kami ambil.",
                      })}
                    </motion.p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
                  {ifTropicalPointsFor(lang).map((point, i) => (
                    <motion.div
                      key={point.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: (i % 2) * 0.1, duration: 0.7, ease: EASE }}
                    >
                      <FeatureCard icon={point.icon} motionKey={TROPICAL_MOTION[i] ?? "pulse"} title={point.title}>
                        {point.body}
                      </FeatureCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Capabilities */}
            <section className="mx-auto max-w-[1360px] px-3 md:px-6">
              <div
                data-header-theme="dark"
                className="relative overflow-hidden rounded-[28px] bg-[#08313A] px-6 py-16 md:px-12 md:py-20"
              >
                <div className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-[#14919B]/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-[#45DFB1]/15 blur-3xl" />
                <div className="relative grid gap-12 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-5">
                    <Eyebrow dark>{t({ en: "Capabilities", id: "Kapabilitas" })}</Eyebrow>
                    <SectionHeading
                      first={t({ en: "What we bring", id: "Apa yang kami" })}
                      second={t({ en: "to the table.", id: "tawarkan." })}
                      dark
                    />
                    <motion.p
                      {...fadeUp(0.2)}
                      className="mt-6 max-w-[460px] text-base leading-relaxed text-white/70 md:text-lg"
                      style={body}
                    >
                      {t({
                        en: "Instrumentation, control, and crop science developed in our own greenhouses and plant factory, and taught to the people who will run yours.",
                        id: "Instrumentasi, kendali, dan ilmu tanaman yang dikembangkan di greenhouse dan plant factory kami sendiri, lalu diajarkan kepada tim yang akan menjalankan fasilitas Anda.",
                      })}
                    </motion.p>
                    <motion.div {...fadeUp(0.3)} className="mt-8">
                      <Link
                        to="/technology"
                        className="group inline-flex items-center gap-2 border-b border-[#45DFB1]/40 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#45DFB1] transition-colors hover:border-[#45DFB1]"
                        style={body}
                      >
                        {t({ en: "All smartagri technology", id: "Semua teknologi smartagri" })}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </motion.div>
                  </div>
                  <motion.ul
                    variants={chipList}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                    className="grid gap-3 sm:grid-cols-2 lg:col-span-7"
                  >
                    {ifCapabilitiesFor(lang).map((cap) => (
                      <motion.li
                        key={cap.label}
                        variants={chipItem}
                        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[#45DFB1]/50 hover:bg-white/[0.08]"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[#45DFB1] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]">
                          <cap.icon className="h-5 w-5 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110" />
                        </span>
                        <span className="text-[15px] text-white/85" style={body}>
                          {cap.label}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>
              </div>
            </section>

            {/* How a collaboration runs */}
            <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="mb-14 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Eyebrow>{t({ en: "How we work together", id: "Cara kita bekerja sama" })}</Eyebrow>
                  <SectionHeading
                    first={t({ en: "From a question", id: "Dari sebuah pertanyaan" })}
                    second={t({ en: "to a running facility.", id: "menjadi fasilitas yang berjalan." })}
                  />
                </div>
                <motion.p
                  {...fadeUp(0.2)}
                  className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg"
                  style={body}
                >
                  {t({
                    en: "A typical collaboration, from the first look at the crop and the site to the first seasons of running it together.",
                    id: "Alur kolaborasi yang umum, dari tinjauan pertama atas tanaman dan lokasi hingga musim-musim pertama menjalankannya bersama.",
                  })}
                </motion.p>
              </div>
              <ProcessSteps steps={ifProcessFor(lang)} />
            </section>

            {/* From the field notes */}
            {relatedNotes.length > 0 && (
              <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
                <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                  <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <Eyebrow>{t({ en: "Knowledge", id: "Pengetahuan" })}</Eyebrow>
                      <SectionHeading
                        first={t({ en: "From the", id: "Dari" })}
                        second={t({ en: "field notes.", id: "catatan lapangan." })}
                      />
                    </div>
                    <motion.div {...fadeUp(0.2)}>
                      <Link
                        to="/indoor-farming/knowledge"
                        className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
                        style={body}
                      >
                        {t({ en: "All knowledge", id: "Semua pengetahuan" })}
                        <ArrowRight className="h-4 w-4 text-[#45DFB1] transition-transform group-hover:translate-x-1" />
                      </Link>
                    </motion.div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedNotes.map((note, i) => (
                      <motion.div
                        key={note.slug}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ delay: i * 0.08, duration: 0.7, ease: EASE }}
                        className={i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}
                      >
                        <NoteCard note={note} index={i} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <CallToAction />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
