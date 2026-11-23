import { createFileRoute } from "@tanstack/react-router";
import { CostPage } from "../components/erp/CostPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/costs/")({
  component: CostPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Biaya | agrosphere" : "Costs | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
