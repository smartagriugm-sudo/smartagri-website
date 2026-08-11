import { createFileRoute } from "@tanstack/react-router";
import DashboardOverview from "../components/dashboard/DashboardOverview";

export const Route = createFileRoute("/indoor-farming_/dashboard/")({
  component: DashboardOverview,
  head: () => ({
    meta: [{ title: "Overview · Dashboard | smartagri" }],
  }),
});
