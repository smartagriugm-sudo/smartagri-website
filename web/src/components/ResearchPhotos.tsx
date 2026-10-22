import { motion } from "framer-motion";
import { EASE } from "./NoteParts";

// Photo treatment shared by /research and each research area's page: the
// main photo wipes in over a mint block that slides out behind it, and a
// smaller supporting photo rises in below, overlapping on the other side.
// Each wrapper watches the viewport itself: a fully clipped photo never
// counts as visible, so it could not trigger its own reveal.

export function RevealPhoto({
  src,
  side,
  alt,
  className = "",
}: {
  src: string;
  side: "left" | "right";
  alt: string;
  className?: string;
}) {
  const from = side === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className={`relative pb-6 pr-6 md:pb-8 md:pr-8 ${className}`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-[78%] w-[62%] rounded-[24px] bg-[#45DFB1]"
        variants={{
          hidden: { opacity: 0, x: -30, y: -30 },
          show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.9, ease: EASE } },
        }}
      />
      <motion.div
        className="relative overflow-hidden rounded-[24px] shadow-[0_30px_70px_-40px_rgba(8,49,58,0.6)]"
        variants={{
          hidden: { clipPath: from },
          show: {
            clipPath: "inset(0% 0% 0% 0%)",
            transition: { duration: 1.1, ease: EASE, delay: 0.15 },
          },
        }}
      >
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
          variants={{
            hidden: { scale: 1.15 },
            show: { scale: 1, transition: { duration: 1.6, ease: EASE, delay: 0.15 } },
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// Main photo plus a smaller one tucked under it on the opposite side.
export function PhotoPair({
  main,
  second,
  side,
  label,
}: {
  main: string;
  second?: string;
  side: "left" | "right";
  label: string;
}) {
  const secondOnRight = side === "left";
  return (
    <div>
      <RevealPhoto src={main} side={side} alt={label} />
      {second && (
        <motion.figure
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
          className={`relative z-[1] -mt-10 w-[64%] md:-mt-16 ${secondOnRight ? "ml-auto mr-0" : "ml-0"}`}
        >
          <div className="overflow-hidden rounded-[20px] border-[6px] border-white shadow-[0_24px_60px_-30px_rgba(8,49,58,0.55)]">
            <img
              src={second}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105"
            />
          </div>
        </motion.figure>
      )}
    </div>
  );
}
