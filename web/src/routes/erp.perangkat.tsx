import { createFileRoute } from "@tanstack/react-router";
import DevicesPage from "../components/erp/DevicesPage";

export const Route = createFileRoute("/erp/perangkat")({
  component: DevicesPage,
  head: () => ({
    meta: [
      { title: "Perangkat | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
