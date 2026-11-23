import { createFileRoute } from "@tanstack/react-router";
import { PurchasePage } from "../components/erp/PurchasePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/purchasing/")({
  component: PurchasePage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Pembelian | agrosphere" : "Purchasing | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
