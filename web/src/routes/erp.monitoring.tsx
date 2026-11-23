import { createFileRoute } from "@tanstack/react-router";
import MonitoringPage from "../components/erp/MonitoringPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/monitoring")({
  component: MonitoringPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Kondisi | agrosphere" : "Conditions | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
