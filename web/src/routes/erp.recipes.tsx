import { createFileRoute } from "@tanstack/react-router";
import RecipesPage from "../components/erp/RecipesPage";

export const Route = createFileRoute("/erp/recipes")({
  component: RecipesPage,
  head: () => ({
    meta: [
      { title: "Recipes | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
