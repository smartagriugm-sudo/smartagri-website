import { createFileRoute } from "@tanstack/react-router";
import { PurchaseDetailPage } from "../components/erp/PurchasePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/purchasing/$id")({
  component: Page,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Pembelian | agrosphere" : "Purchasing | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <PurchaseDetailPage key={id} id={id} />;
}
