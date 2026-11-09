import { createFileRoute } from "@tanstack/react-router";
import PartnersPage from "../components/erp/PartnersPage";

export const Route = createFileRoute("/erp/customers")({
  component: PartnersPage,
  head: () => ({
    meta: [
      { title: "Customers | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
