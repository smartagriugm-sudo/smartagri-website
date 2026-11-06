import { createFileRoute } from "@tanstack/react-router";
import AttendanceBoardPage from "../components/erp/AttendanceBoardPage";

export const Route = createFileRoute("/erp/kehadiran")({
  component: AttendanceBoardPage,
  head: () => ({
    meta: [
      { title: "Kehadiran | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
