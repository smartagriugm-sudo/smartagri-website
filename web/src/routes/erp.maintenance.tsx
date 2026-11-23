import { createFileRoute } from "@tanstack/react-router";
import MaintenancePage from "../components/erp/MaintenancePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/maintenance")({
  component: MaintenancePage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Pemeliharaan | agrosphere" : "Maintenance | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
