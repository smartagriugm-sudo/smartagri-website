import { createFileRoute } from "@tanstack/react-router";
import { PurchasePage } from "../components/erp/PurchasePage";

export const Route = createFileRoute("/erp/pembelian/")({
  component: PurchasePage,
  head: () => ({
    meta: [
      { title: "Pembelian | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
