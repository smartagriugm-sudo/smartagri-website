import { createFileRoute } from "@tanstack/react-router";
import StockCountPage from "../components/erp/StockCountPage";

export const Route = createFileRoute("/erp/stock-count")({
  component: StockCountPage,
  head: () => ({
    meta: [
      { title: "Stock count | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
