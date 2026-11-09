import { createFileRoute } from "@tanstack/react-router";
import SchedulePage from "../components/erp/SchedulePage";

export const Route = createFileRoute("/erp/schedule")({
  component: SchedulePage,
  head: () => ({
    meta: [
      { title: "Schedule | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
