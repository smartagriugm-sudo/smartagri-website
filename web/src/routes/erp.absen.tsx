import { createFileRoute } from "@tanstack/react-router";
import AttendancePage from "../components/erp/AttendancePage";

export const Route = createFileRoute("/erp/absen")({
  component: AttendancePage,
  head: () => ({
    meta: [
      { title: "Absen | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
