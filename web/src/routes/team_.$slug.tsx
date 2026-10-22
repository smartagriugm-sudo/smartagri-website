import { Link, createFileRoute } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Linkedin,
  Mail,
  Sparkles,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { findMember, publicationsFor, TEAM } from "../lib/team";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { MemberPhoto, TeamCard } from "../components/TeamCard";
import { EASE, MaskLine, META } from "../components/NoteParts";

export const Route = createFileRoute("/team_/$slug")({
  component: MemberPage,
  loader: ({ params }) => findMember(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Team"} | smartagri` },
      ...(loaderData
        ? [
            {
              name: "description",
              content: `${loaderData.fullName}, ${loaderData.role}, Smart Agriculture Research Center UGM.`,
            },
          ]
        : []),
    ],
  }),
});

// One member: back / next links, a sticky portrait with the profile links,
// the profile itself (bio, expertise, projects, newest papers), more of the
// team, and the landing CTA.

const SHOWN_PAPERS = 6;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { delay, duration: 0.6, ease: EASE },
});

function SectionLabel({ icon: Icon, children }: { icon: typeof Sparkles; children: string }) {
  return (
    <p className={`mb-4 flex items-center gap-2 text-[#14919B] ${META}`} style={body}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </p>
  );
}

function MemberPage() {
  const member = Route.useLoaderData();

  if (!member) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900" style={display}>
              Member not found
            </h1>
            <Link
              to="/team"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Team
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const memberIndex = TEAM.findIndex((m) => m.slug === member.slug);
  const next = TEAM[(memberIndex + 1) % TEAM.length];
  const papers = [...publicationsFor(member)].sort((a, b) => Number(b.year) - Number(a.year));
  const others = [...TEAM.slice(memberIndex + 1), ...TEAM.slice(0, memberIndex)].slice(0, 4);

  const links = [
    member.email && { href: `mailto:${member.email}`, label: "Email", icon: Mail, primary: true, external: false },
    member.acadstaff && { href: member.acadstaff, label: "Academic Staff", icon: GraduationCap, external: true },
    member.scholar && { href: member.scholar, label: "Google Scholar", icon: BookOpen, external: true },
    member.linkedin && { href: member.linkedin, label: "LinkedIn", icon: Linkedin, external: true },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Mail; primary?: boolean; external: boolean }[];

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={5} />
          <div className="relative" key={member.slug}>
            {/* Back / next */}
            <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 border-b border-[#0B6477]/10 px-6 pb-4 pt-8 md:px-12">
              <Link
                to="/team"
                className={`group inline-flex items-center gap-2 text-neutral-600 hover:text-[#0B6477] ${META}`}
                style={body}
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                All members
              </Link>
              <Link
                to="/team/$slug"
                params={{ slug: next.slug }}
                className={`group inline-flex items-center gap-2 text-right text-neutral-600 hover:text-[#0B6477] ${META}`}
                style={body}
              >
                <span>
                  <span className="hidden sm:inline">Next: </span>
                  {next.name}
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <section className="mx-auto grid max-w-[1200px] gap-10 px-6 pb-20 pt-12 md:px-12 md:pb-28 md:pt-16 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
              {/* Portrait + links, sticky on desktop */}
              <aside>
                <div className="lg:sticky lg:top-28">
                  <motion.div
                    initial="hidden"
                    animate="show"
                    className="relative pb-5 pr-5"
                  >
                    <motion.div
                      aria-hidden="true"
                      className="absolute bottom-0 right-0 h-[70%] w-[70%] rounded-[24px] bg-[#45DFB1]"
                      variants={{
                        hidden: { opacity: 0, x: -24, y: -24 },
                        show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.9, ease: EASE } },
                      }}
                    />
                    <motion.div
                      className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-[#F3F7F6] shadow-[0_30px_70px_-40px_rgba(8,49,58,0.6)]"
                      variants={{
                        hidden: { clipPath: "inset(100% 0% 0% 0%)" },
                        show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.1, ease: EASE, delay: 0.15 } },
                      }}
                    >
                      <MemberPhoto member={member} index={memberIndex} />
                    </motion.div>
                  </motion.div>

                  {links.length > 0 && (
                    <motion.div
                      initial="hidden"
                      animate="show"
                      variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }}
                      className="mt-6 flex flex-col gap-2"
                    >
                      {links.map((l) => (
                        <motion.a
                          key={l.label}
                          href={l.href}
                          target={l.external ? "_blank" : undefined}
                          rel={l.external ? "noreferrer" : undefined}
                          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                          className={`group flex h-11 items-center justify-between rounded-lg px-4 text-sm font-medium uppercase tracking-[0.06em] transition-colors ${
                            l.primary
                              ? "bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99]"
                              : "border border-[#0B6477]/20 bg-white/80 text-[#0B6477] hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1]"
                          }`}
                          style={body}
                        >
                          <span className="flex items-center gap-2">
                            <l.icon className="h-4 w-4" />
                            {l.label}
                          </span>
                          <ArrowUpRight className="h-4 w-4 transition-[rotate] duration-300 group-hover:rotate-45" />
                        </motion.a>
                      ))}
                    </motion.div>
                  )}
                </div>
              </aside>

              {/* Profile */}
              <div className="min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-wrap gap-2"
                >
                  <span className={`rounded-full bg-[#08313A] px-3 py-1 text-[#45DFB1] ${META}`} style={body}>
                    {member.category}
                  </span>
                  {member.coordinator && (
                    <span className={`rounded-full bg-[#45DFB1] px-3 py-1 text-[#0B2A22] ${META}`} style={body}>
                      Research group coordinator
                    </span>
                  )}
                </motion.div>
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="mt-5 text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[64px]"
                  style={display}
                >
                  <MaskLine delay={0.05}>{member.name}</MaskLine>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.6 }}
                  className="mt-4 text-[15px] leading-relaxed text-neutral-500"
                  style={body}
                >
                  {member.fullName}
                  <br />
                  <span className="text-[#0B6477]">{member.role}</span> · Smart Agriculture Research
                  Center, UGM
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
                  className="mt-8 max-w-[720px] text-lg leading-relaxed text-neutral-700 md:text-xl"
                  style={body}
                >
                  {member.bio}
                </motion.p>

                <div className="mt-12 grid gap-6 md:grid-cols-2">
                  <motion.div {...fadeUp()} className="rounded-[24px] border border-[#0B6477]/10 bg-white/90 p-6 md:p-7">
                    <SectionLabel icon={Sparkles}>Expertise</SectionLabel>
                    <motion.ul
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.5 }}
                      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                      className="flex flex-wrap gap-2"
                    >
                      {member.expertise.map((item) => (
                        <motion.li
                          key={item}
                          variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                          className="rounded-full border border-[#0B6477]/15 bg-[#F3F7F6] px-3 py-1.5 text-[13px] text-[#0B6477]"
                          style={body}
                        >
                          {item}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                  <motion.div {...fadeUp(0.1)} className="rounded-[24px] border border-[#0B6477]/10 bg-white/90 p-6 md:p-7">
                    <SectionLabel icon={FlaskConical}>Current research & projects</SectionLabel>
                    <motion.ul
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.5 }}
                      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                      className="flex flex-col gap-2.5"
                      style={body}
                    >
                      {member.projects.map((project) => (
                        <motion.li
                          key={project}
                          variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                          className="flex gap-2.5 text-[15px] leading-snug text-neutral-800"
                        >
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#14919B]" />
                          {project}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                </div>

                {papers.length > 0 && (
                  <div className="mt-12">
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <SectionLabel icon={BookOpen}>Selected publications</SectionLabel>
                      <span className={`mb-4 text-neutral-400 ${META}`} style={body}>
                        {Math.min(SHOWN_PAPERS, papers.length)} of {papers.length}, newest first
                      </span>
                    </div>
                    <ol>
                      {papers.slice(0, SHOWN_PAPERS).map((pub, i) => (
                        <motion.li key={pub.slug} {...fadeUp(i * 0.05)} className="border-t border-[#0B6477]/12 last:border-b">
                          <Link
                            to="/publications/$slug"
                            params={{ slug: pub.slug }}
                            className="group grid gap-2 py-5 transition-colors duration-300 hover:bg-[#F3F7F6] md:grid-cols-[64px_minmax(0,1fr)_40px] md:items-center md:gap-5 md:px-4"
                          >
                            <span className="text-lg font-semibold tracking-[-0.02em] text-[#14919B] tabular-nums" style={display}>
                              {pub.year}
                            </span>
                            <span className="min-w-0">
                              <span
                                className="block text-[16px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-[#0B6477]"
                                style={display}
                              >
                                {pub.title}
                              </span>
                              <span className="mt-1 block truncate text-sm text-neutral-500" style={body}>
                                {[pub.venue, pub.citations ? `Cited by ${pub.citations}` : ""].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            <span className="hidden h-10 w-10 place-items-center justify-self-end rounded-lg border border-[#0B6477]/25 text-[#0B6477] transition-colors duration-300 group-hover:border-[#08313A] group-hover:bg-[#08313A] group-hover:text-[#45DFB1] md:grid">
                              <ArrowUpRight className="h-4 w-4 transition-[rotate] duration-300 group-hover:rotate-45" />
                            </span>
                          </Link>
                        </motion.li>
                      ))}
                    </ol>
                    {papers.length > SHOWN_PAPERS && (
                      <Link
                        to="/publications"
                        className="group mt-6 inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                        style={body}
                      >
                        All publications
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* More from the team */}
            {others.length > 0 && (
              <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
                <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-12 md:py-24">
                  <div className="mb-10 flex items-end justify-between gap-6">
                    <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 md:text-5xl" style={display}>
                      More from
                      <br />
                      <span style={accent}>the team.</span>
                    </h2>
                    <Link
                      to="/team"
                      className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                      style={body}
                    >
                      All members
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                    {others.map((m, i) => (
                      <TeamCard key={m.slug} member={m} index={i} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            <CallToAction />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
