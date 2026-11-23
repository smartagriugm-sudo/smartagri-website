import { createFileRoute } from "@tanstack/react-router";
import RecipesPage from "../components/erp/RecipesPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/recipes")({
  component: RecipesPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Resep | agrosphere" : "Recipes | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
