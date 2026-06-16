import { motion } from "framer-motion";
import {
  ClipboardList,
  FileText,
  FlaskConical,
  GraduationCap,
  LineChart,
  Search,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import PartnerMarquee from "./PartnerMarquee";

// "Our collaboration process" — six steps from first contact to a working,
// supported deployment, in smartagri's voice. TODO: team to review the copy.
const steps = [
  {
    icon: Search,
    title: "Inquiry & Assessment",
    desc: "You reach out and tell us about your land, crop, or challenge. We review your goals and field conditions to see how we can help.",
  },
  {
    icon: ClipboardList,
    title: "Field Scoping & Blueprint",
    desc: "Our researchers study your context, gather technical requirements, and shape an approach tailored to your crop, climate, and scale.",
  },
  {
    icon: FileText,
    title: "Proposal & Agreement",
    desc: "We share a clear plan covering timeline, technology, resources, and key milestones, so everyone knows what to expect.",
  },
  {
    icon: FlaskConical,
    title: "Deployment & Trial",
    desc: "Our team installs sensors, flies drones, or runs models on your plots, testing under real field conditions with open communication.",
  },
  {
    icon: GraduationCap,
    title: "Handover & Training",
    desc: "We hand over the working system with documentation and train your team to run it confidently, season after season.",
  },
  {
    icon: LineChart,
    title: "Review & Support",
    desc: "We measure results against your goals and stay on to maintain, support, and keep improving the system over time.",
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

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* connecting line behind the icon row, only when all six sit in one row */}
          <div className="hidden xl:block absolute top-7 left-[8.33%] right-[8.33%] h-px bg-[#0B6477]/15" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (i % 6) * 0.08, duration: 0.5, ease: "easeOut" }}
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
              <div
                className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#14919B]"
                style={body}
              >
                Step {i + 1}
              </div>
              <h3
                className="text-base md:text-lg font-medium text-neutral-900 leading-snug -mt-2"
                style={display}
              >
                {step.title}
              </h3>
              <p
                className="text-sm font-normal text-neutral-500 leading-relaxed max-w-[260px]"
                style={body}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* The partners we collaborate with: who pairs with the process above. */}
        <div className="mt-16 md:mt-20 pt-12 border-t border-[#0B6477]/10">
          <h3
            className="text-center text-xl md:text-2xl font-medium text-neutral-900 mb-10"
            style={display}
          >
            In collaboration with <span style={accent}>leading partners</span>
          </h3>
          <PartnerMarquee />
        </div>
      </div>
    </section>
  );
}
