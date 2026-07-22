import { motion } from "framer-motion";
import { accent, body, display } from "./fonts";

export type CallToActionProps = Record<string, never>;

// smartagri's closing CTA banner: dark #08313A card with soft teal/mint glow
// blobs, a headline with a mint accent word, and the primary + secondary
// actions. Self-contained; used at the foot of the landing page.
export function CallToAction() {
  return (
    <section id="contact" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl bg-[#08313A] px-6 py-16 md:p-20 text-center flex flex-col items-center gap-6"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full bg-[#14919B]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 w-[360px] h-[360px] rounded-full bg-[#45DFB1]/20 blur-3xl" />
          <h2
            className="relative text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-white max-w-[720px]"
            style={display}
          >
            Let's grow the future of farming{" "}
            <span style={{ ...accent, color: "#80ED99" }}>together</span>
          </h2>
          <p
            className="relative text-base md:text-lg font-normal text-white/75 max-w-[560px]"
            style={body}
          >
            Partner with our researchers, pilot smartagri on your fields, or
            join the team building data-driven agriculture.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 mt-2">
            <a
              href="/contact-us"
              className="h-12 md:h-14 px-8 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-lg font-medium hover:bg-[#80ED99] transition-colors shadow-lg flex items-center justify-center"
              style={body}
            >
              Contact us
            </a>
            <a
              href="/about-us"
              className="h-12 md:h-14 px-8 rounded-2xl border border-white/40 text-white text-lg font-medium hover:bg-white/10 transition-colors flex items-center justify-center"
              style={body}
            >
              Explore partnerships
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
