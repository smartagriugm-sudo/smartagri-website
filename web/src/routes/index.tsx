import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Leaf } from "lucide-react";
import ConstellationGrid from "../components/ConstellationGrid";
import AmbientWash from "../components/AmbientWash";
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
    <section
      data-header-theme="dark"
      className="relative min-h-screen w-full text-white flex flex-col justify-between p-6 md:p-12 overflow-hidden">
      {/* Plain brand-deep background with the interactive sensor-node mesh,
          softened in the centre and at the edges so the headline stays calm. */}
      <div className="absolute inset-0 bg-[#08313A] z-0" />
      <ConstellationGrid className="z-0" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_55%_45%_at_50%_45%,rgba(8,49,58,0.85)_0%,rgba(8,49,58,0.35)_60%,transparent_100%)]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#08313A]/70 via-transparent to-[#08313A]/90" />

      <div className="w-full max-w-[880px] mx-auto flex flex-col justify-center items-center gap-5 md:gap-6 text-center my-auto z-10 px-4 pt-[76px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-[13px] md:text-sm font-medium tracking-[0.03em] text-[#45DFB1]"
          style={body}
        >
          Smart Agriculture Research Center UGM
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
            Sense.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="inline-block mr-[0.25em]"
          >
            Analyze.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="inline-block"
            style={{ ...accent, color: "#45DFB1" }}
          >
            Grow.
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 mt-1"
        >
          <Link
            to="/contact-us"
            hash="inquiry"
            className="group h-12 md:h-14 px-6 md:px-7 bg-[#45DFB1] rounded-lg inline-flex items-center gap-3 text-[#0B2A22] text-sm md:text-[15px] font-medium uppercase tracking-[0.08em] hover:bg-[#80ED99] transition-colors shadow-lg"
            style={body}
          >
            Start a project
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/research"
            className="group inline-flex items-center gap-2 pb-1.5 border-b border-white/40 hover:border-[#45DFB1] text-white text-sm md:text-[15px] font-medium uppercase tracking-[0.08em] transition-colors"
            style={body}
          >
            Explore our research
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
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
          className="flex flex-row flex-wrap lg:flex-col items-center lg:items-end gap-2 md:gap-2.5 w-full md:w-auto justify-start md:justify-end"
        >
          <div
            className="h-12 md:h-[56px] px-4 md:px-5 rounded-2xl border border-white/40 text-white text-[15px] md:text-lg font-medium whitespace-nowrap flex items-center justify-center"
            style={body}
          >
            Solutions for real-world fields
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 md:w-[56px] md:h-[56px] rounded-2xl border border-white/40 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#80ED99]" />
            </div>
            <div
              className="h-12 md:h-[56px] px-4 md:px-5 rounded-2xl border border-white/40 text-white text-[15px] md:text-lg font-medium whitespace-nowrap flex items-center justify-center"
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
      {/* One continuous layer of drifting washes behind every light section,
          so the gradient flows across section boundaries without seams. */}
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={8} />
        <div className="relative">
          <ResearchAreas />
          <Publications />
          <FieldNotes />
          <GalleryPreview />
          <CollaborationProcess />
          <CallToAction />
        </div>
      </div>
      <Footer />
    </main>
  );
}
