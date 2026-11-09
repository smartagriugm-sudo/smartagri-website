import { createFileRoute } from "@tanstack/react-router";
import StockItemPage from "../components/erp/StockItemPage";

export const Route = createFileRoute("/erp/stock/$id")({
  component: DetailRoute,
  head: () => ({
    meta: [
      { title: "Item | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function DetailRoute() {
  const { id } = Route.useParams();
  return <StockItemPage key={id} id={id} />;
}
