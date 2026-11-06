import { createFileRoute } from "@tanstack/react-router";
import { PurchaseDetailPage } from "../components/erp/PurchasePage";

export const Route = createFileRoute("/erp/pembelian/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Pembelian | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <PurchaseDetailPage key={id} id={id} />;
}
