import { createFileRoute } from "@tanstack/react-router";
import StockPage from "../components/erp/StockPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/stock/")({
  component: StockPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Stok | agrosphere" : "Stock | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
