import { createFileRoute } from "@tanstack/react-router";
import { CostPage } from "../components/erp/CostPage";

export const Route = createFileRoute("/erp/biaya/")({
  component: CostPage,
  head: () => ({
    meta: [
      { title: "Biaya | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
