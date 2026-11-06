import { createFileRoute } from "@tanstack/react-router";
import StockPage from "../components/erp/StockPage";

export const Route = createFileRoute("/erp/stok")({
  component: StockPage,
  head: () => ({
    meta: [
      { title: "Stok | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
