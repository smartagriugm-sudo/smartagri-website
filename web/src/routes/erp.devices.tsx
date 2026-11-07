import { createFileRoute } from "@tanstack/react-router";
import DevicesPage from "../components/erp/DevicesPage";

export const Route = createFileRoute("/erp/devices")({
  component: DevicesPage,
  head: () => ({
    meta: [
      { title: "Devices | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
