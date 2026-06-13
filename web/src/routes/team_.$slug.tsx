import { Link, createFileRoute, createLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  Linkedin,
  Mail,
  Sparkles,
} from "lucide-react";
import { body, display } from "../lib/fonts";
import { findMember, publicationsFor, TEAM } from "../lib/team";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { MemberPhoto } from "../components/TeamCard";

const MotionLink = createLink(motion.a);

export const Route = createFileRoute("/team_/$slug")({
  component: MemberPage,
  loader: ({ params }) => findMember(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Team"} — smartagri` },
      ...(loaderData
        ? [
            {
              name: "description",
              content: `${loaderData.fullName} — ${loaderData.role}, Smart Agriculture Research Center UGM.`,
            },
          ]
        : []),
    ],
  }),
});

function MemberPage() {
  const member = Route.useLoaderData();

  if (!member) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1
              className="text-3xl md:text-4xl font-semibold text-neutral-900"
              style={display}
            >
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
  const publications = publicationsFor(member);

  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Link
              to="/team"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline mb-8"
              style={body}
            >
              <ArrowLeft className="w-4 h-4" />
              All members
            </Link>

            <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">
              {/* Left: portrait + contact */}
              <div className="flex flex-col gap-4">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-[#0B6477]/10">
                  <MemberPhoto member={member} index={memberIndex} />
                </div>
                {(member.email || member.linkedin) && (
                  <div className="flex flex-col gap-2">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-[#45DFB1] text-[#0B2A22] font-medium hover:bg-[#80ED99] transition-colors"
                        style={body}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </a>
                    )}
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 h-11 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
                        style={body}
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Right: profile */}
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className="rounded-full bg-[#0B6477] text-white text-xs font-semibold px-3 py-1"
                      style={body}
                    >
                      {member.category}
                    </span>
                    {member.coordinator && (
                      <span
                        className="rounded-full bg-[#45DFB1] text-[#0B2A22] text-xs font-semibold px-3 py-1"
                        style={body}
                      >
                        Research Group Coordinator
                      </span>
                    )}
                  </div>
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] text-neutral-900"
                    style={display}
                  >
                    {member.fullName}
                  </h1>
                  <div
                    className="text-base font-normal text-neutral-500 mt-2"
                    style={body}
                  >
                    {member.role} · Smart Agriculture Research Center, UGM
                  </div>
                </div>

                <p
                  className="text-base font-normal text-neutral-600 leading-relaxed"
                  style={body}
                >
                  {member.bio}
                </p>

                <div>
                  <div
                    className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-3"
                    style={body}
                  >
                    <Sparkles className="w-4 h-4 text-[#14919B]" />
                    Expertise
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.expertise.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#0B6477]/25 px-3 py-1 text-sm font-normal text-[#0B6477]"
                        style={body}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div
                    className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-3"
                    style={body}
                  >
                    <FlaskConical className="w-4 h-4 text-[#14919B]" />
                    Current research & projects
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {member.projects.map((project) => (
                      <li
                        key={project}
                        className="flex items-start gap-2 text-sm sm:text-base font-normal text-neutral-600"
                        style={body}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#45DFB1] mt-2 shrink-0" />
                        {project}
                      </li>
                    ))}
                  </ul>
                </div>

                {publications.length > 0 && (
                  <div>
                    <div
                      className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-3"
                      style={body}
                    >
                      <BookOpen className="w-4 h-4 text-[#14919B]" />
                      Selected publications
                    </div>
                    <div className="flex flex-col gap-3">
                      {publications.map((pub) => (
                        <MotionLink
                          key={pub.slug}
                          to="/publications/$slug"
                          params={{ slug: pub.slug }}
                          className="group rounded-2xl bg-white border border-[#0B6477]/10 hover:shadow-lg transition-shadow p-5 flex items-start gap-4"
                        >
                          <span className="flex-1">
                            <span
                              className="block text-sm sm:text-base font-medium text-neutral-900 leading-snug"
                              style={display}
                            >
                              {pub.title}
                            </span>
                            <span
                              className="block text-xs sm:text-sm font-normal text-neutral-500 mt-1"
                              style={body}
                            >
                              {pub.year} — {pub.venue}
                            </span>
                          </span>
                          <ArrowUpRight className="shrink-0 w-5 h-5 text-[#0B6477] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </MotionLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
