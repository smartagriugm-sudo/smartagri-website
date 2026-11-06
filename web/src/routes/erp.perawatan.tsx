import { createFileRoute } from "@tanstack/react-router";
import MaintenancePage from "../components/erp/MaintenancePage";

export const Route = createFileRoute("/erp/perawatan")({
  component: MaintenancePage,
  head: () => ({
    meta: [
      { title: "Perawatan | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
