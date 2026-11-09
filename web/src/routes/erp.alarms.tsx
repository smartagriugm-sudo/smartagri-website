import { createFileRoute } from "@tanstack/react-router";
import AlarmPage from "../components/erp/AlarmPage";

export const Route = createFileRoute("/erp/alarms")({
  component: AlarmPage,
  head: () => ({
    meta: [
      { title: "Alarms | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
