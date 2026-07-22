import { motion } from "framer-motion";
import { accent, body, display } from "./fonts";

export type ImpactStat = { value: string; label: string };

export type ImpactProps = {
  /** Stat tiles to display. Defaults to the center's headline figures. */
  stats?: ImpactStat[];
};

// Default headline figures; replace with the center's real numbers.
export const stats: ImpactStat[] = [
  { value: "24+", label: "Active research projects" },
  { value: "120+", label: "Partner farms & cooperatives" },
  { value: "38", label: "Peer-reviewed publications" },
  { value: "12k+", label: "Hectares monitored by our sensors" },
];

// Impact band: a row of large teal stat numbers with captions, each animating
// up on scroll. The variant axis is the `stats` array.
export function Impact({ stats: statsProp = stats }: ImpactProps) {
  return (
    <section id="impact" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <h2
          className="text-center text-2xl md:text-3xl font-medium text-neutral-900 mb-12"
          style={display}
        >
          Research that <span style={accent}>delivers in the field</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
          {statsProp.map((stat, i) => (
            <motion.div
              key={stat.label}
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
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
