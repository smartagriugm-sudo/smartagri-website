import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import ResearchAreas from "../components/ResearchAreas";
import Publications from "../components/Publications";
import FieldNotes from "../components/FieldNotes";
import GalleryPreview from "../components/GalleryPreview";
import CollaborationProcess from "../components/CollaborationProcess";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";

export const Route = createFileRoute("/")({ component: Home });

function AnimatedWords({ text, baseDelay }: { text: string; baseDelay: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: baseDelay + i * 0.045,
            duration: 0.5,
            ease: "easeOut",
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen w-full text-white flex flex-col justify-between p-6 md:p-12 overflow-hidden">
      {/* Team photo behind a heavy green wash, so the hero reads brand-green
          first and imagery second (not a raw photo). */}
      <div className="absolute inset-0 bg-[#08313A] z-0" />
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${A.heroPhoto})` }}
      />
      <div className="absolute inset-0 bg-[#08313A]/82 z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08313A]/70 via-[#0B6477]/40 to-[#08313A]/85 z-0" />

      <div className="w-full max-w-[880px] mx-auto flex flex-col justify-center items-center gap-5 md:gap-6 text-center my-auto z-10 px-4 pt-[76px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-[13px] md:text-sm font-medium tracking-[0.03em] text-[#45DFB1]"
          style={body}
        >
          Smart Agriculture Research Center, UGM
        </motion.div>
        <h1
          className="text-white text-[52px] sm:text-[68px] md:text-[88px] font-semibold tracking-[-0.04em] leading-[1.02]"
          style={display}
        >
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-block mr-[0.25em]"
          >
            sense.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="inline-block mr-[0.25em]"
          >
            analyze.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="inline-block"
            style={{ ...accent, color: "#45DFB1" }}
          >
            grow.
          </motion.span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.55 }}
          className="text-white/85 text-lg md:text-xl font-normal leading-relaxed max-w-[600px]"
          style={body}
        >
          Turning field data into healthier, more sustainable harvests.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="h-12 md:h-14 px-6 md:px-8 py-3 bg-[#45DFB1] rounded-2xl inline-flex justify-center items-center text-[#0B2A22] text-lg md:text-xl font-medium hover:bg-[#80ED99] transition-colors shadow-lg mt-1"
          style={body}
        >
          Explore our research
        </motion.button>
      </div>

      <footer className="w-full max-w-[1360px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-10">
        <div
          className="w-full md:w-[480px] max-w-prose text-white/85 text-base md:text-lg font-normal leading-[1.45] text-left"
          style={body}
        >
          <AnimatedWords
            baseDelay={1.2}
            text="We sense the field with IoT and imaging, analyze it with AI and data, and help farmers grow more sustainably. From precision irrigation to early disease detection, our research turns readings into decisions farmers can act on."
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="flex flex-row flex-wrap lg:flex-col items-center lg:items-end gap-2.5 w-full md:w-auto justify-end"
        >
          <div
            className="h-[56px] px-5 rounded-2xl border border-white/40 text-white text-base md:text-lg font-medium whitespace-nowrap flex items-center justify-center"
            style={body}
          >
            Solutions for real-world fields
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[56px] h-[56px] rounded-2xl border border-white/40 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#80ED99]" />
            </div>
            <div
              className="h-[56px] px-5 rounded-2xl border border-white/40 text-white text-base md:text-lg font-medium whitespace-nowrap flex items-center justify-center"
              style={body}
            >
              Sensing &amp; intelligence
            </div>
          </div>
        </motion.div>
      </footer>
    </section>
  );
}

function Home() {
  return (
    <main>
      <SiteHeader overlay />
      <Hero />
      <ResearchAreas />
      <Publications />
      <FieldNotes />
      <GalleryPreview />
      <CollaborationProcess />
      <CallToAction />
      <Footer />
    </main>
  );
}
