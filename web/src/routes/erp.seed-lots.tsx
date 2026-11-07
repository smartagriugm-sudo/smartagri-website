import { createFileRoute } from "@tanstack/react-router";
import SeedLotsPage from "../components/erp/SeedLotsPage";

export const Route = createFileRoute("/erp/seed-lots")({
  component: SeedLotsPage,
  head: () => ({
    meta: [
      { title: "Seed lots | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
