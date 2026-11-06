import { createFileRoute } from "@tanstack/react-router";
import { CostDetailPage } from "../components/erp/CostPage";

export const Route = createFileRoute("/erp/biaya/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Biaya batch | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <CostDetailPage key={id} id={id} />;
}
