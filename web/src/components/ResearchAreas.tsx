import { createLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";

// Router-typed Link that also accepts framer-motion animation props.
const MotionLink = createLink(motion.a);

export default function ResearchAreas() {
  return (
    <section id="research" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-16 pb-20">
        <h2
          className="text-center text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.1] mb-12 text-neutral-900"
          style={display}
        >
          <span style={accent}>Smart research</span> for the
          <br />
          fields of tomorrow
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RESEARCH_AREAS.map((area, i) => (
            <MotionLink
              key={area.label}
              to="/research/$slug"
              params={{ slug: area.slug }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: (i % 3) * 0.1, duration: 0.55, ease: "easeOut" }}
              className="group rounded-3xl bg-white border border-[#0B6477]/10 p-7 flex flex-col gap-4 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                  <area.icon className="w-6 h-6 text-[#45DFB1]" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-[#0B6477] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <h3
                className="text-xl md:text-2xl font-medium text-neutral-900 leading-snug"
                style={display}
              >
                {area.label}
              </h3>
              <p
                className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed"
                style={body}
              >
                {area.desc}
              </p>
            </MotionLink>
          ))}
        </div>
      </div>
    </section>
  );
}
