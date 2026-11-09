import { createFileRoute } from "@tanstack/react-router";
import AttendanceBoardPage from "../components/erp/AttendanceBoardPage";

export const Route = createFileRoute("/erp/attendance")({
  component: AttendanceBoardPage,
  head: () => ({
    meta: [
      { title: "Attendance | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
