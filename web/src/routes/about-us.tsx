import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { accent, body, display, serif } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";
import { coreMembers } from "../lib/team";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { TeamCard } from "../components/TeamCard";

export const Route = createFileRoute("/about-us")({
  component: AboutUsPage,
  head: () => ({
    meta: [
      {
        title: "About Us | smartagri",
      },
      {
        name: "description",
        content:
          "Who we are: the mission, expertise, and people behind the Smart Agriculture Research Center.",
      },
    ],
  }),
});

const team = coreMembers();

function AboutUsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="About Us"
            title={
              <>
                The people behind <span style={accent}>smartagri</span>
              </>
            }
            subtitle="We are a research center at Universitas Gadjah Mada that believes the future of farming is grown together, by agronomists, engineers, and farmers like you."
          />
          <div className="grid lg:grid-cols-2 gap-6 max-w-[1100px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="rounded-3xl bg-[#08313A] p-8 md:p-10 flex flex-col gap-4"
            >
              <h2 className="text-2xl md:text-3xl font-medium text-white" style={display}>
                Our mission
              </h2>
              <p
                className="text-xl md:text-2xl text-white leading-snug"
                style={serif}
              >
                Harness AI, sensing, and agronomy so every farmer, whatever
                the size of their plot, can grow more with less.
              </p>
              <p
                className="text-base font-normal text-white/70 leading-relaxed"
                style={body}
              >
                Climate volatility, shrinking land, and rising costs hit
                smallholders first. We build and test the technology that helps
                them monitor crops, predict yields, and act with confidence.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
              className="rounded-3xl bg-white border border-[#0B6477]/10 p-8 md:p-10 flex flex-col gap-4"
            >
              <h2
                className="text-2xl md:text-3xl font-medium text-neutral-900"
                style={display}
              >
                Rooted in research
              </h2>
              <p
                className="text-base font-normal text-neutral-500 leading-relaxed"
                style={body}
              >
                The Smart Agriculture Research Center is part of the Department
                of Agricultural and Biosystems Engineering, Faculty of
                Agricultural Technology, Universitas Gadjah Mada, in
                Yogyakarta. Our team unites researchers across AI, IoT systems,
                remote sensing, and agronomy.
              </p>
              <p
                className="text-base font-normal text-neutral-500 leading-relaxed"
                style={body}
              >
                Everything we publish is field-tested with the cooperatives we
                serve. Research is only finished when a farmer can use it.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2
            className="text-center text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-neutral-900 mb-12"
            style={display}
          >
            What we're <span style={accent}>good at</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
            {RESEARCH_AREAS.map((area, i) => (
              <motion.div
                key={area.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.55, ease: "easeOut" }}
                className="rounded-3xl bg-[#F3F7F6] p-7 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                  <area.icon className="w-6 h-6 text-[#45DFB1]" />
                </div>
                <h3
                  className="text-lg md:text-xl font-medium text-neutral-900"
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
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            className="max-w-[1100px] mx-auto mt-6"
          >
            <Link
              to="/technology"
              className="group flex items-center justify-between rounded-3xl bg-[#08313A] px-7 py-6 hover:bg-[#0B6477] transition-colors"
            >
              <span
                className="text-base md:text-lg font-medium text-white"
                style={display}
              >
                Explore the 12 core technologies behind these research areas
              </span>
              <ArrowUpRight className="w-6 h-6 text-[#45DFB1] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2
            className="text-center text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-neutral-900 mb-12"
            style={display}
          >
            Meet the <span style={accent}>team</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 max-w-[1100px] mx-auto">
            {team.map((member, i) => (
              <TeamCard key={member.slug} member={member} index={i} />
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <Link
              to="/team"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] text-lg font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              View all members
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-3xl bg-[#08313A] p-8 md:p-14 grid lg:grid-cols-2 gap-10 items-center"
          >
            <div className="flex flex-col gap-4">
              <h2
                className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-white leading-[1.1]"
                style={display}
              >
                Work <span style={{ ...accent, color: "#80ED99" }}>with us</span>
              </h2>
              <p
                className="text-base md:text-lg font-normal text-white/75 max-w-[480px]"
                style={body}
              >
                Partner on a research project, pilot smartagri on your fields,
                or join the team. We answer every message.
              </p>
              <a
                href="/contact-us"
                className="self-start h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-lg font-medium hover:bg-[#80ED99] transition-colors flex items-center"
                style={body}
              >
                Contact us
              </a>
            </div>
            {/* Placeholder contact details; replace with the center's real ones */}
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-[#45DFB1] mt-1 shrink-0" />
                <span className="text-base font-normal text-white/80" style={body}>
                  Jl. Flora Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok,
                  Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281
                </span>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-[#45DFB1] mt-1 shrink-0" />
                <a
                  href="mailto:hello@smartagri.id"
                  className="text-base font-normal text-white/80 hover:text-white transition-colors"
                  style={body}
                >
                  hello@smartagri.id
                </a>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="w-5 h-5 text-[#45DFB1] mt-1 shrink-0" />
                <span className="text-base font-normal text-white/80" style={body}>
                  +62 274 000 0000
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
