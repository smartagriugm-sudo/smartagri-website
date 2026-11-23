import { createFileRoute } from "@tanstack/react-router";
import SchedulePage from "../components/erp/SchedulePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/schedule")({
  component: SchedulePage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Jadwal | agrosphere" : "Schedule | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
