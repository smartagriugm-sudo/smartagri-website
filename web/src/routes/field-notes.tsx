import { createFileRoute } from "@tanstack/react-router";
import { accent } from "../lib/fonts";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import NotesExplorer from "../components/NotesExplorer";
import Footer from "../components/Footer";

export const Route = createFileRoute("/field-notes")({
  component: FieldNotesPage,
  head: () => ({
    meta: [
      {
        title: "Field Notes — smartagri",
      },
      {
        name: "description",
        content:
          "News, research updates, practical guides, and stories from the farms and labs the Smart Agriculture Research Center works in.",
      },
    ],
  }),
});

function FieldNotesPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Field Notes"
            title={
              <>
                Notes from the <span style={accent}>lab and field</span>
              </>
            }
            subtitle="Everything we publish outside of journals: news from the center, research updates, practical guides for farmers, and recaps of the events we host."
          />
          <NotesExplorer />
        </div>
      </section>
      <Footer />
    </main>
  );
}
