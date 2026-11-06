import { createFileRoute } from "@tanstack/react-router";
import SchedulePage from "../components/erp/SchedulePage";

export const Route = createFileRoute("/erp/jadwal")({
  component: SchedulePage,
  head: () => ({
    meta: [
      { title: "Jadwal | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
