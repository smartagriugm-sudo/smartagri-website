import { createFileRoute, redirect } from "@tanstack/react-router";
import SiteHeader from "../components/SiteHeader";
import GalleryPreview from "../components/GalleryPreview";
import AmbientWash from "../components/AmbientWash";
import Footer from "../components/Footer";

export const Route = createFileRoute("/gallery")({
  component: GalleryPage,
  // Older links used /gallery?album=<slug>; albums now have their own page.
  validateSearch: (search: Record<string, unknown>): { album?: string } =>
    typeof search.album === "string" ? { album: search.album } : {},
  beforeLoad: ({ search }) => {
    if (search.album) {
      throw redirect({ to: "/gallery/$slug", params: { slug: search.album } });
    }
  },
  head: () => ({
    meta: [
      { title: "Gallery | smartagri" },
      {
        name: "description",
        content:
          "Documentation of smartagri activities: exhibitions, conferences, field work, workshops, and collaborations from the Smart Agriculture Research Center.",
      },
    ],
  }),
});

// Same Quayside-style layout as the landing Gallery section, in archive mode
// (every album), over drifting washes. Each album opens /gallery/<slug>.
function GalleryPage() {
  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={4} />
        <div className="relative">
          <GalleryPreview archive />
        </div>
      </div>
      <Footer />
    </main>
  );
}
