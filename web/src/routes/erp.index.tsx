import { createFileRoute } from "@tanstack/react-router";
import ErpDashboard from "../components/erp/ErpDashboard";

export const Route = createFileRoute("/erp/")({
  component: ErpDashboard,
  head: () => ({
    meta: [
      { title: "Dashboard | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
