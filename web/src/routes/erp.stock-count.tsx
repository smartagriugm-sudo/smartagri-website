import { createFileRoute } from "@tanstack/react-router";
import StockCountPage from "../components/erp/StockCountPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/stock-count")({
  component: StockCountPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Stok opname | agrosphere" : "Stock count | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
