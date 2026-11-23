import { createFileRoute } from "@tanstack/react-router";
import SeedLotsPage from "../components/erp/SeedLotsPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/seed-lots")({
  component: SeedLotsPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Lot benih | agrosphere" : "Seed lots | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
