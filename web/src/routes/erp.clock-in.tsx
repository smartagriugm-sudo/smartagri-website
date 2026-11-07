import { createFileRoute } from "@tanstack/react-router";
import AttendancePage from "../components/erp/AttendancePage";

export const Route = createFileRoute("/erp/clock-in")({
  component: AttendancePage,
  head: () => ({
    meta: [
      { title: "Clock in | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
