import { createFileRoute } from "@tanstack/react-router";
import PersonProfilePage from "../components/erp/PersonProfilePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/people/$id")({
  component: DetailRoute,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Profil | agrosphere" : "Profile | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function DetailRoute() {
  const { id } = Route.useParams();
  return <PersonProfilePage key={id} id={id} />;
}
