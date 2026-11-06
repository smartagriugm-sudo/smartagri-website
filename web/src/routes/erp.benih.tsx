import { createFileRoute } from "@tanstack/react-router";
import SeedLotsPage from "../components/erp/SeedLotsPage";

export const Route = createFileRoute("/erp/benih")({
  component: SeedLotsPage,
  head: () => ({
    meta: [
      { title: "Lot benih | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
