import { createFileRoute } from "@tanstack/react-router";
import AttendancePage from "../components/erp/AttendancePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/clock-in")({
  component: AttendancePage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Absen | agrosphere" : "Clock in | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
