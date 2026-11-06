import { createFileRoute } from "@tanstack/react-router";
import StockCountPage from "../components/erp/StockCountPage";

export const Route = createFileRoute("/erp/opname")({
  component: StockCountPage,
  head: () => ({
    meta: [
      { title: "Opname | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
