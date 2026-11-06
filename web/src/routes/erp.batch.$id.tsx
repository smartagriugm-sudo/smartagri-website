import { createFileRoute } from "@tanstack/react-router";
import BatchDetailPage from "../components/erp/BatchDetailPage";

export const Route = createFileRoute("/erp/batch/$id")({
  component: BatchRoute,
  validateSearch: (search: Record<string, unknown>): { hole?: string } => (typeof search.hole === "string" ? { hole: search.hole } : {}),
  head: () => ({
    meta: [
      { title: "Batch | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function BatchRoute() {
  const { id } = Route.useParams();
  const { hole } = Route.useSearch();
  return <BatchDetailPage key={id} id={id} focusHole={hole} />;
}
