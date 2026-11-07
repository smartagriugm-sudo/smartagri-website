import { createFileRoute } from "@tanstack/react-router";
import StockPage from "../components/erp/StockPage";

export const Route = createFileRoute("/erp/stock/")({
  component: StockPage,
  head: () => ({
    meta: [
      { title: "Stock | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
