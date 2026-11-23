import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Cpu, Download, ShieldCheck, Wifi } from "lucide-react";
import { indoorDashboardImage } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  AERIAL_KEYS,
  DASHBOARD_STACK,
  ROOT_KEYS,
  metricsFor,
  type MetricKey,
  type StackItem,
} from "../lib/indoor-dashboard";
import { headLang, localizeAll, useLang, useT, type Bi, type Lang } from "../lib/i18n";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import IndoorFarmingCrumb from "../components/IndoorFarmingCrumb";
import IndoorDashboard from "../components/IndoorDashboard";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { PhotoPair } from "../components/ResearchPhotos";
import { EASE, MaskLine } from "../components/NoteParts";
import { Eyebrow, FeatureCard, IconTile, fadeUp, useHover } from "../components/IndoorFarmingParts";

export const Route = createFileRoute("/indoor-farming_/instrumentation")({
  component: IndoorFarmingInstrumentationPage,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        {
          title:
            l === "id"
              ? "Instrumentasi · Indoor Farming | smartagri"
              : "Instrumentation · Indoor Farming | smartagri",
        },
        {
          name: "description",
          content:
            l === "id"
              ? "Demo langsung dashboard lingkungan terkendali smartagri: suhu udara, kelembapan, VPD, CO2, PPFD dan DLI, pH, EC, oksigen terlarut, suhu nutrisi, dan stasiun cuaca luar ruang, dalam satu layar."
              : "A live demo of the smartagri controlled-environment dashboard: air temperature, humidity, VPD, CO2, PPFD and DLI, pH, EC, dissolved oxygen, nutrient temperature, and an outdoor weather station, in one screen.",
        },
      ],
    };
  },
});

// Why the demo runs on simulated data, stated plainly on the page as well as
// here: the research facility is not exposed to the public internet, and a
// promotional page that silently invents live readings would be dishonest. The
// simulation is physically grounded (see lib/indoor-dashboard.ts) so what a
// visitor sees is the real shape of a tropical growing day.
//
// Layout: masthead, the dashboard on a dark card, the parameters (aerial and
// root zone behind a toggle), the instrument stack, how it runs, and the
// landing call to action.

const GROUPS = [
  {
    key: "aerial",
    label: { en: "Aerial environment", id: "Lingkungan udara" } as Bi,
    caption: {
      en: "What the canopy is breathing, feeling, and being lit by.",
      id: "Udara yang dihirup kanopi, kondisi yang dirasakannya, dan cahaya yang diterimanya.",
    } as Bi,
    keys: AERIAL_KEYS,
  },
  {
    key: "root",
    label: { en: "Root zone", id: "Zona akar" } as Bi,
    caption: {
      en: "The nutrient side, measured inline rather than by hand once a day.",
      id: "Sisi nutrisi, diukur langsung di jalur, bukan manual sekali sehari.",
    } as Bi,
    keys: ROOT_KEYS,
  },
] as const;

const RUNS = [
  {
    icon: Cpu,
    motion: "technology",
    title: { en: "Control stays local", id: "Kendali tetap lokal" } as Bi,
    body: {
      en: "The controller holds the setpoints and keeps actuating whether or not the internet is up. The dashboard is a window onto it, not the thing keeping the crop alive.",
      id: "Pengendali menyimpan setpoint dan terus menggerakkan aktuator, ada internet atau tidak. Dashboard hanyalah jendela untuk melihatnya, bukan yang membuat tanaman tetap hidup.",
    } as Bi,
  },
  {
    icon: Wifi,
    motion: "pulse",
    title: { en: "Buffered upload", id: "Unggahan tersangga" } as Bi,
    body: {
      en: "Readings are logged at full resolution on site and backfilled when the link returns, so a dropout leaves a gap in the view, never in the record.",
      id: "Bacaan dicatat dengan resolusi penuh di lokasi dan dikirim susulan saat koneksi kembali, jadi koneksi putus hanya meninggalkan celah di tampilan, tidak pernah di catatan.",
    } as Bi,
  },
  {
    icon: ShieldCheck,
    motion: "float",
    title: { en: "Calibration is tracked", id: "Kalibrasi terlacak" } as Bi,
    body: {
      en: "Every probe carries its last calibration date and drift. A sensor past due is flagged on the screen rather than quietly trusted.",
      id: "Setiap probe membawa tanggal kalibrasi terakhir dan drift-nya. Sensor yang lewat jadwal ditandai di layar, bukan dipercaya diam-diam.",
    } as Bi,
  },
  {
    icon: Download,
    motion: "rain",
    title: { en: "The data is yours", id: "Datanya milik Anda" } as Bi,
    body: {
      en: "Full-resolution history exports as CSV for analysis in R, Python, or a spreadsheet. A trial should be writable from the log without asking us for it.",
      id: "Riwayat beresolusi penuh bisa diekspor sebagai CSV untuk dianalisis di R, Python, atau spreadsheet. Laporan uji coba harus bisa ditulis dari log tanpa perlu meminta datanya kepada kami.",
    } as Bi,
  },
];

const STACK_MOTION = ["wind", "rain", "sun", "technology"];

// Indonesian copy for the instrument stack (lib/indoor-dashboard.ts has no
// Indonesian overlay for it), keyed by the English title.
const DASHBOARD_STACK_ID: Record<string, Pick<StackItem, "title" | "body" | "points">> = {
  "Aerial sensing": {
    title: "Sensor udara",
    body: "Lingkungan kanopi: udara yang dihirup tanaman, kondisi yang dirasakannya, dan cahaya yang diterimanya.",
    points: [
      "Suhu udara dan kelembapan relatif beraspirasi setinggi kanopi",
      "Defisit tekanan uap dihitung langsung dari keduanya",
      "Karbon dioksida NDIR, dengan koreksi baseline mingguan",
      "Sensor quantum PAR untuk PPFD, diintegrasikan menjadi DLI berjalan",
      "Suhu daun inframerah untuk mendeteksi penutupan stomata lebih awal",
    ],
  },
  "Root zone sensing": {
    title: "Sensor zona akar",
    body: "Sisi nutrisi, diukur langsung di jalur, bukan dengan meter genggam sekali sehari.",
    points: [
      "pH dan EC di jalur balik, dengan kompensasi suhu",
      "Oksigen terlarut optik di tangki pencampur",
      "Suhu nutrisi di tangki dan di titik penyaluran",
      "Debit per kelompok katup, sehingga setiap dosing terkonfirmasi, bukan diasumsikan",
    ],
  },
  "Weather station": {
    title: "Stasiun cuaca",
    body: "Kondisi batas di luar ruang, karena rumah tanam tropis selalu menjawab langit.",
    points: [
      "Suhu udara, kelembapan, dan tekanan barometrik",
      "Radiasi matahari global dalam W/m² dan PAR luar ruang",
      "Kecepatan dan arah angin untuk interlock keselamatan ventilasi",
      "Curah hujan tipping-bucket, dicatat per menit",
    ],
  },
  "Control and logging": {
    title: "Kendali dan pencatatan",
    body: "Lapisan yang mengubah bacaan menjadi tindakan dan menyimpan catatan yang bisa menjadi dasar laporan uji coba.",
    points: [
      "Pengendali lokal tetap berjalan saat internet mati",
      "Resep setpoint per tanaman dan fase pertumbuhan",
      "Aturan alarm untuk rentang, laju perubahan, dan sensor yang tidak mengirim data",
      "Riwayat beresolusi penuh diekspor sebagai CSV untuk analisis",
    ],
  },
};

function stackFor(lang: Lang): StackItem[] {
  return localizeAll(DASHBOARD_STACK, DASHBOARD_STACK_ID, (s) => s.title, lang);
}

/** A target-band bound as written in the visitor's language (decimal comma in Indonesian). */
function bound(n: number, lang: Lang): string {
  return lang === "id" ? String(n).replace(".", ",") : String(n);
}

function MetricCard({ k }: { k: MetricKey }) {
  const lang = useLang();
  const t = useT();
  const m = metricsFor(lang)[k];
  const { state, bind } = useHover();
  return (
    <div
      {...bind}
      className="group flex h-full flex-col gap-4 rounded-[24px] border border-[#0B6477]/10 bg-white/85 p-6 backdrop-blur transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={m.icon} motionKey="pulse" state={state} />
        <span
          className="rounded-full border border-[#0B6477]/12 bg-[#F3F7F6] px-2.5 py-1 text-[11px] font-medium tabular-nums text-[#0B6477] transition-colors duration-300 group-hover:border-white/15 group-hover:bg-white/10 group-hover:text-[#45DFB1]"
          style={body}
        >
          {bound(m.optimal[0], lang)} {t({ en: "to", id: "sampai" })} {bound(m.optimal[1], lang)} {m.unit}
        </span>
      </div>
      <h3
        className="text-xl font-medium tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white"
        style={display}
      >
        {m.label}
        {m.unit && (
          <span className="ml-1.5 text-sm font-normal text-neutral-400 group-hover:text-white/50">{m.unit}</span>
        )}
      </h3>
      <p
        className="flex-1 text-[15px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70"
        style={body}
      >
        {m.why}
      </p>
      <p
        className="border-t border-[#0B6477]/10 pt-3 text-[13px] leading-relaxed text-neutral-400 transition-colors duration-300 group-hover:border-white/10 group-hover:text-white/50"
        style={body}
      >
        {m.sensor}
      </p>
    </div>
  );
}

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

function IndoorFarmingInstrumentationPage() {
  const lang = useLang();
  const t = useT();
  const [groupKey, setGroupKey] = useState<(typeof GROUPS)[number]["key"]>("aerial");
  const group = GROUPS.find((g) => g.key === groupKey)!;

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader subnav={<IndoorFarmingNav />} />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={7} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pb-14 pt-12 md:px-12 md:pb-16 md:pt-16">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <IndoorFarmingCrumb current={t({ en: "Instrumentation", id: "Instrumentasi" })} />
              </motion.div>
              <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px] lg:col-span-8"
                  style={display}
                >
                  <MaskLine delay={0}>
                    {t({ en: "Every sensor we build,", id: "Setiap sensor buatan kami," })}
                  </MaskLine>
                  <MaskLine delay={0.12}>
                    {t({ en: "reporting to", id: "melapor ke" })}{" "}
                    <span style={accent}>{t({ en: "one screen.", id: "satu layar." })}</span>
                  </MaskLine>
                </motion.h1>
                <div className="lg:col-span-4">
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="text-base leading-relaxed text-neutral-600 md:text-lg"
                    style={body}
                  >
                    {t({
                      en: "Climate, light, and nutrient instrumentation from our own greenhouses and plant factory, brought together in a single control view.",
                      id: "Instrumentasi iklim, cahaya, dan nutrisi dari greenhouse dan plant factory kami sendiri, disatukan dalam satu tampilan kendali.",
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
                      {t({ en: "Request a walkthrough", id: "Minta tur demo" })}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/technology"
                      className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                      style={body}
                    >
                      {t({ en: "Our technology", id: "Teknologi kami" })}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* The dashboard itself */}
            <section className="mx-auto max-w-[1360px] px-3 md:px-6">
              <motion.div
                data-header-theme="dark"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.9, ease: EASE }}
                className="relative overflow-hidden rounded-[28px] bg-[#08313A] px-3 py-10 sm:px-6 md:px-10 md:py-14"
              >
                <div className="pointer-events-none absolute -right-24 -top-40 h-[520px] w-[520px] rounded-full bg-[#14919B]/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-52 -left-32 h-[520px] w-[520px] rounded-full bg-[#45DFB1]/15 blur-3xl" />
                <div className="relative mb-8 flex flex-col gap-4 px-3 sm:px-0 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <Eyebrow dark>
                      <span className="relative mr-1 inline-flex h-2 w-2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#45DFB1]/70" />
                        <span className="relative h-2 w-2 rounded-full bg-[#45DFB1]" />
                      </span>
                      {t({ en: "Live demo", id: "Demo langsung" })}
                    </Eyebrow>
                    <h2
                      className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl"
                      style={display}
                    >
                      {t({ en: "A day in a tropical", id: "Sehari di rumah tanam" })}{" "}
                      <span style={{ ...accent, color: "#80ED99" }}>
                        {t({ en: "growing house.", id: "tropis." })}
                      </span>
                    </h2>
                  </div>
                  <p className="max-w-[420px] text-[15px] leading-relaxed text-white/60" style={body}>
                    {t({
                      en: "The clock advances on its own. Pause it, pick a different zone, or switch the chart to another parameter to see how the readings move together.",
                      id: "Jam berjalan sendiri. Jeda, pilih zona lain, atau ganti parameter grafik untuk melihat bagaimana bacaan bergerak bersama.",
                    })}
                  </p>
                </div>
                <div className="relative">
                  <IndoorDashboard />
                </div>
                <p
                  className="relative mt-6 max-w-[760px] px-3 text-xs leading-relaxed text-white/45 sm:px-0"
                  style={body}
                >
                  {t({
                    en: "Demonstration data. The readings are generated from physical models of a tropical growing day, not streamed from the research facility. Vapour pressure deficit is computed from the air temperature and humidity shown beside it, and the daily light integral is the running integral of PPFD, so the relationships between parameters behave exactly as they do in a real house.",
                    id: "Data demonstrasi. Bacaan dihasilkan dari model fisik satu hari tanam tropis, bukan dialirkan dari fasilitas riset. Defisit tekanan uap dihitung dari suhu udara dan kelembapan yang ditampilkan di sampingnya, dan integral cahaya harian (DLI) adalah integral berjalan dari PPFD, sehingga hubungan antarparameter berperilaku persis seperti di rumah tanam sungguhan.",
                  })}
                </p>
              </motion.div>
            </section>

            {/* Parameters */}
            <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Eyebrow>{t({ en: "Parameters", id: "Parameter" })}</Eyebrow>
                  <SectionHeading
                    first={t({ en: "What we measure, and", id: "Apa yang kami ukur, dan" })}
                    second={t({ en: "why it earns its place.", id: "mengapa itu penting." })}
                  />
                </div>
                <motion.p
                  {...fadeUp(0.2)}
                  className="max-w-[460px] text-base leading-relaxed text-neutral-500 md:text-lg"
                  style={body}
                >
                  {t({
                    en: "A dashboard is only worth the decisions it changes. Each parameter is on the screen because a grower acts on it, not because the sensor was cheap to add.",
                    id: "Nilai sebuah dashboard ada pada keputusan yang diubahnya. Setiap parameter tampil di layar karena petani bertindak berdasarkannya, bukan karena sensornya murah untuk ditambahkan.",
                  })}
                </motion.p>
              </div>

              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={t({ en: "Parameter group", id: "Kelompok parameter" })}>
                  {GROUPS.map((g) => {
                    const on = g.key === groupKey;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setGroupKey(g.key)}
                        className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          on
                            ? "border-transparent text-white"
                            : "border-[#0B6477]/15 bg-white/70 text-neutral-700 hover:border-[#0B6477]/40"
                        }`}
                        style={body}
                      >
                        {on && (
                          <motion.span
                            layoutId="if-param-pill"
                            className="absolute inset-0 rounded-full bg-[#08313A]"
                            transition={{ duration: 0.45, ease: EASE }}
                          />
                        )}
                        <span className="relative">
                          {t(g.label)}
                          <span className={on ? "text-white/60" : "text-neutral-400"}> {g.keys.length}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={group.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="text-[15px] text-neutral-500"
                    style={body}
                  >
                    {t(group.caption)}
                  </motion.p>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={group.key}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {group.keys.map((k) => (
                    <motion.div
                      key={k}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
                      }}
                    >
                      <MetricCard k={k} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* The stack */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto grid max-w-[1360px] gap-12 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-12 lg:gap-14">
                <div className="lg:col-span-7">
                  <Eyebrow>{t({ en: "What is plugged in", id: "Apa yang terpasang" })}</Eyebrow>
                  <SectionHeading
                    first={t({ en: "Instruments we built,", id: "Instrumen yang kami bangun," })}
                    second={t({ en: "and maintain ourselves.", id: "dan kami rawat sendiri." })}
                  />
                  <motion.p
                    {...fadeUp(0.15)}
                    className="mt-6 max-w-[600px] text-base leading-relaxed text-neutral-600 md:text-lg"
                    style={body}
                  >
                    {t({
                      en: "The dashboard is the visible end of a stack that starts at the probe. Everything on it is running in our own facility, which is where the calibration routines and failure modes were learned.",
                      id: "Dashboard adalah ujung yang terlihat dari rangkaian yang berawal di probe. Semua yang tampil di dalamnya berjalan di fasilitas kami sendiri, tempat kami mempelajari rutinitas kalibrasi dan pola kegagalannya.",
                    })}
                  </motion.p>
                  <div className="mt-10 grid gap-5 sm:grid-cols-2">
                    {stackFor(lang).map((s, i) => (
                      <motion.div
                        key={s.title}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ delay: (i % 2) * 0.1, duration: 0.7, ease: EASE }}
                      >
                        <FeatureCard icon={s.icon} motionKey={STACK_MOTION[i] ?? "pulse"} title={s.title}>
                          <p>{s.body}</p>
                          <ul className="mt-4 flex flex-col gap-2">
                            {s.points.map((p) => (
                              <li key={p} className="flex gap-2.5">
                                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 bg-[#45DFB1]" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </FeatureCard>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div className="lg:sticky lg:top-[160px]">
                    <PhotoPair
                      main={indoorDashboardImage("sensor-node.webp")}
                      second={indoorDashboardImage("control-cabinet.webp")}
                      side="right"
                      label={t({
                        en: "Sensor node mounted at canopy height inside a greenhouse",
                        id: "Node sensor terpasang setinggi kanopi di dalam greenhouse",
                      })}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* How it runs */}
            <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Eyebrow>{t({ en: "How it runs", id: "Cara kerjanya" })}</Eyebrow>
                  <SectionHeading
                    first={t({ en: "Designed for a house with an", id: "Dirancang untuk rumah tanam dengan" })}
                    second={t({ en: "unreliable connection.", id: "koneksi yang tidak andal." })}
                  />
                </div>
                <motion.div {...fadeUp(0.2)}>
                  <Link
                    to="/indoor-farming/$section"
                    params={{ section: "technology" }}
                    className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                    style={body}
                  >
                    {t({ en: "Explore the technology", id: "Jelajahi teknologinya" })}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {RUNS.map((r, i) => (
                  <motion.div
                    key={r.title.en}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: i * 0.08, duration: 0.7, ease: EASE }}
                  >
                    <FeatureCard icon={r.icon} motionKey={r.motion} title={t(r.title)}>
                      {t(r.body)}
                    </FeatureCard>
                  </motion.div>
                ))}
              </div>
            </section>

            <CallToAction />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
