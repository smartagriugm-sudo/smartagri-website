import { createFileRoute } from "@tanstack/react-router";
import DashboardOverview from "../components/dashboard/DashboardOverview";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/indoor-farming_/dashboard/")({
  component: DashboardOverview,
  head: ({ matches }) => ({
    meta: [{ title: headLang(matches) === "id" ? "Ringkasan · Dashboard | smartagri" : "Overview · Dashboard | smartagri" }],
  }),
});
