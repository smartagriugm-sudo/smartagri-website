import { createFileRoute } from "@tanstack/react-router";
import { CostDetailPage } from "../components/erp/CostPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/costs/$id")({
  component: Page,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Biaya batch | agrosphere" : "Batch costs | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <CostDetailPage key={id} id={id} />;
}
