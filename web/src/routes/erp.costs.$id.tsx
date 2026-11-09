import { createFileRoute } from "@tanstack/react-router";
import { CostDetailPage } from "../components/erp/CostPage";

export const Route = createFileRoute("/erp/costs/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Batch costs | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <CostDetailPage key={id} id={id} />;
}
