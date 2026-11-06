import { createFileRoute } from "@tanstack/react-router";
import AlarmPage from "../components/erp/AlarmPage";

export const Route = createFileRoute("/erp/alarm")({
  component: AlarmPage,
  head: () => ({
    meta: [
      { title: "Alarm | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
