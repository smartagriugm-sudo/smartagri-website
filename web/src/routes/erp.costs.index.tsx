import { createFileRoute } from "@tanstack/react-router";
import { CostPage } from "../components/erp/CostPage";

export const Route = createFileRoute("/erp/costs/")({
  component: CostPage,
  head: () => ({
    meta: [
      { title: "Costs | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
