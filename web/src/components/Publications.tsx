import { motion } from "framer-motion";
import { Link, createLink } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { PUBLICATIONS } from "../lib/publications";

const MotionLink = createLink(motion.a);

const publications = PUBLICATIONS.slice(0, 3);

export default function Publications() {
  return (
    <section id="publications" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <h2
          className="text-center text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] mb-12 text-neutral-900"
          style={display}
        >
          From the field to <span style={accent}>peer review</span>
        </h2>
        <div className="max-w-[900px] mx-auto flex flex-col gap-4">
          {publications.map((pub, i) => (
            <MotionLink
              key={pub.title}
              to="/publications/$slug"
              params={{ slug: pub.slug }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.12, duration: 0.55, ease: "easeOut" }}
              className="group rounded-2xl bg-[#0B6477]/5 hover:bg-[#0B6477]/10 transition-colors p-6 md:p-7 flex items-start gap-5"
            >
              <span
                className="shrink-0 rounded-full bg-[#0B6477] text-white text-sm font-semibold px-4 py-2"
                style={body}
              >
                {pub.year}
              </span>
              <span className="flex-1">
                <span
                  className="block text-lg md:text-xl font-medium text-neutral-900 leading-snug"
                  style={display}
                >
                  {pub.title}
                </span>
                <span
                  className="block text-sm md:text-base font-normal text-neutral-500 mt-1"
                  style={body}
                >
                  {pub.authors} — {pub.venue}
                </span>
              </span>
              <ArrowUpRight className="shrink-0 w-6 h-6 text-[#0B6477] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </MotionLink>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          className="flex justify-center mt-10"
        >
          <Link
            to="/publications"
            className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] text-lg font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
            style={body}
          >
            View all publications
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
