import { createFileRoute } from "@tanstack/react-router";
import { PurchasePage } from "../components/erp/PurchasePage";

export const Route = createFileRoute("/erp/purchasing/")({
  component: PurchasePage,
  head: () => ({
    meta: [
      { title: "Purchasing | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
