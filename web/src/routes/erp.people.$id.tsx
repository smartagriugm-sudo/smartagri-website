import { createFileRoute } from "@tanstack/react-router";
import PersonProfilePage from "../components/erp/PersonProfilePage";

export const Route = createFileRoute("/erp/people/$id")({
  component: DetailRoute,
  head: () => ({
    meta: [
      { title: "Profile | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function DetailRoute() {
  const { id } = Route.useParams();
  return <PersonProfilePage key={id} id={id} />;
}
