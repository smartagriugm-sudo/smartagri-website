import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "../components/SiteHeader";
import FieldNotes from "../components/FieldNotes";
import AmbientWash from "../components/AmbientWash";
import Footer from "../components/Footer";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/field-notes")({
  component: FieldNotesPage,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        {
          title: l === "id" ? "Catatan Lapangan | smartagri" : "Field Notes | smartagri",
        },
        {
          name: "description",
          content:
            l === "id"
              ? "Berita, kabar riset, panduan praktis, dan cerita dari lahan serta laboratorium tempat Smart Agriculture Research Center bekerja."
              : "News, research updates, practical guides, and stories from the farms and labs the Smart Agriculture Research Center works in.",
        },
      ],
    };
  },
});

// The archive uses the same Quayside-style layout as the landing section,
// in archive mode (every note, loaded a page at a time), over drifting washes.
function FieldNotesPage() {
  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={5} />
        <div className="relative">
          <FieldNotes archive />
        </div>
      </div>
      <Footer />
    </main>
  );
}
