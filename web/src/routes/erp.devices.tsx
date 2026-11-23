import { createFileRoute } from "@tanstack/react-router";
import DevicesPage from "../components/erp/DevicesPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/devices")({
  component: DevicesPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Perangkat | agrosphere" : "Devices | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
