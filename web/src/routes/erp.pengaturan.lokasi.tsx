import { createFileRoute } from "@tanstack/react-router";
import LocationsPage from "../components/erp/LocationsPage";

export const Route = createFileRoute("/erp/pengaturan/lokasi")({
  component: LocationsPage,
  head: () => ({
    meta: [
      { title: "Lokasi | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
