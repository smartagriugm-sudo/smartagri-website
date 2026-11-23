import { createFileRoute } from "@tanstack/react-router";
import PartnersPage from "../components/erp/PartnersPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/customers")({
  component: PartnersPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Pelanggan | agrosphere" : "Customers | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
