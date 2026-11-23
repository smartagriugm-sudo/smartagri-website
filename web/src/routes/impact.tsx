import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sprout, FlaskConical, Landmark } from "lucide-react";
import { accent, body, display, serif } from "../lib/fonts";
import { stats } from "../components/Impact";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { headLang, useT, type Bi } from "../lib/i18n";

export const Route = createFileRoute("/impact")({
  component: ImpactPage,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        {
          title: l === "id" ? "Dampak | smartagri" : "Impact | smartagri",
        },
        {
          name: "description",
          content:
            l === "id"
              ? "Bagaimana karya Smart Agriculture Research Center hadir di dunia nyata: bagi petani, bagi ilmu pengetahuan, dan bagi kebijakan."
              : "How the Smart Agriculture Research Center's work lands in the real world: for farmers, for science, and for policy.",
        },
      ],
    };
  },
});

const outcomes: { icon: typeof Sprout; title: Bi; desc: Bi }[] = [
  {
    icon: Sprout,
    title: { en: "For farmers", id: "Bagi petani" },
    desc: {
      en: "Less water, fewer losses, better harvest timing. Our partner cooperatives use live field data to decide when to irrigate, scout, and sell.",
      id: "Air lebih hemat, kerugian lebih kecil, waktu panen lebih tepat. Koperasi mitra kami memakai data lahan secara langsung untuk memutuskan kapan mengairi, memantau tanaman, dan menjual hasil.",
    },
  },
  {
    icon: FlaskConical,
    title: { en: "For science", id: "Bagi ilmu pengetahuan" },
    desc: {
      en: "Open datasets, reproducible models, and peer-reviewed methods that other research groups in the region can build on.",
      id: "Dataset terbuka, model yang dapat direproduksi, dan metode peer-reviewed yang dapat dikembangkan lebih lanjut oleh kelompok riset lain di kawasan ini.",
    },
  },
  {
    icon: Landmark,
    title: { en: "For policy & partners", id: "Bagi kebijakan & mitra" },
    desc: {
      en: "Evidence local governments and agribusiness partners use to target subsidies, insurance, and extension programs where they matter most.",
      id: "Bukti yang dipakai pemerintah daerah dan mitra agribisnis untuk mengarahkan subsidi, asuransi, dan program penyuluhan ke tempat yang paling membutuhkan.",
    },
  },
];

function ImpactPage() {
  const t = useT();
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow={t({ en: "Impact", id: "Dampak" })}
            title={t({
              en: (
                <>
                  Research that <span style={accent}>delivers in the field</span>
                </>
              ),
              id: (
                <>
                  Riset yang <span style={accent}>nyata hasilnya di lahan</span>
                </>
              ),
            })}
            subtitle={t({
              en: "Numbers we hold ourselves to, and what they mean for the farmers, scientists, and policymakers we work with.",
              id: "Angka yang menjadi tolok ukur kami, dan artinya bagi petani, ilmuwan, serta pembuat kebijakan yang bekerja bersama kami.",
            })}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-3xl bg-[#08313A] px-6 py-12 md:p-14 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6"
          >
            {stats.map((stat) => (
              <div
                key={stat.value}
                className="flex flex-col items-center text-center gap-2"
              >
                <div
                  className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] text-[#45DFB1]"
                  style={display}
                >
                  {stat.value}
                </div>
                <div
                  className="text-sm md:text-base font-normal text-white/70 max-w-[220px]"
                  style={body}
                >
                  {t(stat.label)}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2
            className="text-center text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-neutral-900 mb-12"
            style={display}
          >
            {t({
              en: (
                <>
                  Where the impact <span style={accent}>lands</span>
                </>
              ),
              id: (
                <>
                  Di mana dampaknya <span style={accent}>terasa</span>
                </>
              ),
            })}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {outcomes.map((outcome, i) => (
              <motion.div
                key={outcome.title.en}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.15, duration: 0.55, ease: "easeOut" }}
                className="rounded-3xl bg-[#F3F7F6] p-8 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                  <outcome.icon className="w-6 h-6 text-[#45DFB1]" />
                </div>
                <h3
                  className="text-xl md:text-2xl font-medium text-neutral-900"
                  style={display}
                >
                  {t(outcome.title)}
                </h3>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed"
                  style={body}
                >
                  {t(outcome.desc)}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[820px] mx-auto text-center"
          >
            <p
              className="text-2xl md:text-3xl text-neutral-900 leading-snug"
              style={serif}
            >
              {t({
                en: "“Instead of guessing when to irrigate or treat crops, we now act on real data, like having an agronomist watching every plot, day and night.”",
                id: "“Dulu kami menebak kapan harus mengairi atau merawat tanaman, sekarang kami bertindak berdasarkan data nyata, seperti punya ahli agronomi yang mengawasi setiap petak siang dan malam.”",
              })}
            </p>
            <footer className="mt-6">
              <span
                className="text-lg text-black"
                style={{ ...serif, fontStyle: "italic", fontWeight: 500 }}
              >
                Bayu Pratama,
              </span>{" "}
              <span
                className="text-base font-normal text-black/50"
                style={body}
              >
                {t({ en: "Farm Cooperative Lead, Sleman", id: "Ketua Koperasi Tani, Sleman" })}
              </span>
            </footer>
          </motion.blockquote>
        </div>
      </section>
      <Footer />
    </main>
  );
}
