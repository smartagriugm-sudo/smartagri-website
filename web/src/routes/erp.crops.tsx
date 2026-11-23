import { createFileRoute } from "@tanstack/react-router";
import CropsPage from "../components/erp/CropsPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/crops")({
  component: CropsPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Tanaman | agrosphere" : "Crops | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
