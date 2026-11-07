import { createFileRoute } from "@tanstack/react-router";
import { PurchaseDetailPage } from "../components/erp/PurchasePage";

export const Route = createFileRoute("/erp/purchasing/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Purchasing | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <PurchaseDetailPage key={id} id={id} />;
}
