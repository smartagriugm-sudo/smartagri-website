import { createFileRoute } from "@tanstack/react-router";
import StockItemPage from "../components/erp/StockItemPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/stock/$id")({
  component: DetailRoute,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Barang | agrosphere" : "Item | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function DetailRoute() {
  const { id } = Route.useParams();
  return <StockItemPage key={id} id={id} />;
}
