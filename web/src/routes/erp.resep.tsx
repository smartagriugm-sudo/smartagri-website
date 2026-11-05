import { createFileRoute } from "@tanstack/react-router";
import RecipesPage from "../components/erp/RecipesPage";

export const Route = createFileRoute("/erp/resep")({
  component: RecipesPage,
  head: () => ({
    meta: [
      { title: "Resep | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
