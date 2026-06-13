import { motion } from "framer-motion";
import { Handshake, PencilRuler, Sprout, TrendingUp } from "lucide-react";
import { accent, body, display } from "../lib/fonts";

// "Our collaboration process" — how a partner goes from first contact to a
// working, supported deployment. TODO: have the team review the copy.
const steps = [
  {
    icon: Handshake,
    title: "Connect",
    desc: "Tell us about your land, crop, or research question. A short conversation is enough to start.",
  },
  {
    icon: PencilRuler,
    title: "Co-design",
    desc: "We scope the problem together and shape an approach that fits your context, scale, and budget.",
  },
  {
    icon: Sprout,
    title: "Pilot in the field",
    desc: "We deploy sensors, drones, or models on your plots and test them under real conditions.",
  },
  {
    icon: TrendingUp,
    title: "Scale & support",
    desc: "What works is rolled out wider, with training and ongoing support for your team.",
  },
];

export default function CollaborationProcess() {
  return (
    <section className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <div className="text-center mb-12">
          <div
            className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
            style={body}
          >
            Our collaboration process
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
            style={display}
          >
            From first hello to <span style={accent}>field results</span>
          </h2>
        </div>

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* connecting line behind the steps on desktop */}
          <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-[#0B6477]/15" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
              className="relative flex flex-col items-center text-center gap-4"
            >
              <div className="relative w-14 h-14 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                <step.icon className="w-7 h-7 text-[#45DFB1]" />
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#45DFB1] text-[#0B2A22] text-xs font-semibold flex items-center justify-center"
                  style={body}
                >
                  {i + 1}
                </span>
              </div>
              <h3
                className="text-lg md:text-xl font-medium text-neutral-900"
                style={display}
              >
                {step.title}
              </h3>
              <p
                className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed max-w-[260px]"
                style={body}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
