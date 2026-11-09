import { createFileRoute } from "@tanstack/react-router";
import OrdersPage from "../components/erp/OrdersPage";

export const Route = createFileRoute("/erp/orders/")({
  component: OrdersPage,
  head: () => ({
    meta: [
      { title: "Orders | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
