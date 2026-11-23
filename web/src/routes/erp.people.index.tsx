import { createFileRoute } from "@tanstack/react-router";
import PeoplePage from "../components/erp/PeoplePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/people/")({
  component: PeoplePage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Personel | agrosphere" : "People | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
