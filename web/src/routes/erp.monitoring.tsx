import { createFileRoute } from "@tanstack/react-router";
import MonitoringPage from "../components/erp/MonitoringPage";

export const Route = createFileRoute("/erp/monitoring")({
  component: MonitoringPage,
  head: () => ({
    meta: [
      { title: "Conditions | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
