import { motion } from "framer-motion";
import { accent, body, display } from "../lib/fonts";
import { useT, type Bi } from "../lib/i18n";

// Placeholder numbers; replace with the center's real figures.
export const stats: { value: string; label: Bi }[] = [
  { value: "24+", label: { en: "Active research projects", id: "Proyek riset aktif" } },
  { value: "120+", label: { en: "Partner farms & cooperatives", id: "Lahan dan koperasi mitra" } },
  { value: "38", label: { en: "Peer-reviewed publications", id: "Publikasi peer-reviewed" } },
  { value: "12k+", label: { en: "Hectares monitored by our sensors", id: "Hektare lahan dipantau sensor kami" } },
];

export default function Impact() {
  const t = useT();
  return (
    <section id="impact" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <h2
          className="text-center text-2xl md:text-3xl font-medium text-neutral-900 mb-12"
          style={display}
        >
          {t({
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
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center text-center gap-2 lg:border-l lg:first:border-l-0 border-[#0B6477]/15"
            >
              <div
                className="text-5xl md:text-6xl font-semibold tracking-[-0.03em] text-[#0B6477]"
                style={display}
              >
                {stat.value}
              </div>
              <div
                className="text-sm md:text-base font-normal text-neutral-500 max-w-[220px]"
                style={body}
              >
                {t(stat.label)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
