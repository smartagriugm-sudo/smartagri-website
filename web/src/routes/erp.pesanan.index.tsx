import { createFileRoute } from "@tanstack/react-router";
import OrdersPage from "../components/erp/OrdersPage";

export const Route = createFileRoute("/erp/pesanan/")({
  component: OrdersPage,
  head: () => ({
    meta: [
      { title: "Pesanan | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
