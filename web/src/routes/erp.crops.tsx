import { createFileRoute } from "@tanstack/react-router";
import CropsPage from "../components/erp/CropsPage";

export const Route = createFileRoute("/erp/crops")({
  component: CropsPage,
  head: () => ({
    meta: [
      { title: "Crops | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
