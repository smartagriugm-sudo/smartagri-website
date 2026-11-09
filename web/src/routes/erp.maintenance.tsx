import { createFileRoute } from "@tanstack/react-router";
import MaintenancePage from "../components/erp/MaintenancePage";

export const Route = createFileRoute("/erp/maintenance")({
  component: MaintenancePage,
  head: () => ({
    meta: [
      { title: "Maintenance | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
