import { createFileRoute } from "@tanstack/react-router";
import PartnersPage from "../components/erp/PartnersPage";

export const Route = createFileRoute("/erp/pelanggan")({
  component: PartnersPage,
  head: () => ({
    meta: [
      { title: "Pelanggan | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
