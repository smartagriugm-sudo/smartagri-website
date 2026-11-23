import { createFileRoute } from "@tanstack/react-router";
import OrdersPage from "../components/erp/OrdersPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/orders/")({
  component: OrdersPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Pesanan | agrosphere" : "Orders | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
