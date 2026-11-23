import { createFileRoute } from "@tanstack/react-router";
import LocationsPage from "../components/erp/LocationsPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/settings/locations")({
  component: LocationsPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Lokasi | agrosphere" : "Locations | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
