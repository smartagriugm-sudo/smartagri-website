import { createFileRoute } from "@tanstack/react-router";
import { accent, body, display } from "../lib/fonts";
import { TEAM_CATEGORIES, membersByCategory } from "../lib/team";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { TeamCard } from "../components/TeamCard";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Team — smartagri" },
      {
        name: "description",
        content:
          "The lecturers, researchers, and students behind the Smart Agriculture Research Center, Universitas Gadjah Mada.",
      },
    ],
  }),
});

const categoryHeadings: Record<string, string> = {
  Lecturer: "Lecturers",
  Researcher: "Researchers",
  Student: "Students",
  "Past Member": "Past Members",
};

function TeamPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Team"
            title={
              <>
                The people growing <span style={accent}>smartagri</span>
              </>
            }
            subtitle="Lecturers, researchers, and students of the Smart Agriculture Research Center — Department of Agricultural and Biosystems Engineering, Universitas Gadjah Mada."
          />
          <div className="flex flex-col gap-14">
            {TEAM_CATEGORIES.map((category) => {
              const members = membersByCategory(category);
              if (members.length === 0) return null;
              return (
                <div key={category}>
                  <h2
                    className="text-2xl md:text-3xl font-semibold text-neutral-900 mb-6"
                    style={display}
                  >
                    {categoryHeadings[category]}{" "}
                    <span
                      className="text-base font-normal text-neutral-400"
                      style={body}
                    >
                      ({members.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {members.map((member, i) => (
                      <TeamCard key={member.slug} member={member} index={i} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
