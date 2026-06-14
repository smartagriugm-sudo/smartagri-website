import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Partners from "../components/Partners";
import ResearchAreas from "../components/ResearchAreas";
import Voices from "../components/Voices";
import Publications from "../components/Publications";
import FieldNotes from "../components/FieldNotes";
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
      {/* TODO: hero.mp4 is missing; brand gradient behind the video keeps the
          hero on-brand until it lands in public/brand/ */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B6477] via-[#14919B] to-[#80ED99] z-0" />
      <video
        src={A.heroVideo}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08313A]/40 via-[#0B6477]/30 to-[#08313A]/60 z-0" />

      <div className="w-full max-w-[820px] mx-auto flex flex-col justify-center items-center gap-6 md:gap-8 text-center my-auto z-10 px-4 pt-[76px]">
        <h1
          className="text-white text-[40px] sm:text-[52px] md:text-[64px] font-semibold tracking-[-0.035em] leading-[1.1] md:leading-[1.05]"
          style={display}
        >
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="block"
          >
            Meet smartagri.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="block"
          >
            <span style={{ ...accent, color: "#45DFB1" }}>
              Cultivating the future
            </span>{" "}
            <span>with</span>
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="block"
          >
            intelligent farming
          </motion.span>
        </h1>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="h-12 md:h-14 px-6 md:px-8 py-3 bg-[#45DFB1] rounded-2xl inline-flex justify-center items-center text-[#0B2A22] text-lg md:text-xl font-medium hover:bg-[#80ED99] transition-colors shadow-lg mt-2 md:mt-0"
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
            text="We unite artificial intelligence, IoT sensing, and agronomy so farmers can monitor crops, predict yields, and act with confidence. From precision irrigation to early disease detection, our research turns field data into healthier, more sustainable harvests."
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
      <Partners />
      <ResearchAreas />
      <Voices />
      <Publications />
      <FieldNotes />
      <CollaborationProcess />
      <CallToAction />
      <Footer />
    </main>
  );
}
