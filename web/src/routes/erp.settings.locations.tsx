import { createFileRoute } from "@tanstack/react-router";
import LocationsPage from "../components/erp/LocationsPage";

export const Route = createFileRoute("/erp/settings/locations")({
  component: LocationsPage,
  head: () => ({
    meta: [
      { title: "Locations | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
