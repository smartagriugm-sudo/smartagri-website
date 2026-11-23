import { createFileRoute } from "@tanstack/react-router";
import AlarmPage from "../components/erp/AlarmPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/alarms")({
  component: AlarmPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Alarm | agrosphere" : "Alarms | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
