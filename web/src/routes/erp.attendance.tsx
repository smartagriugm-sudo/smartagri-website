import { createFileRoute } from "@tanstack/react-router";
import AttendanceBoardPage from "../components/erp/AttendanceBoardPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/attendance")({
  component: AttendanceBoardPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Presensi | agrosphere" : "Attendance | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
