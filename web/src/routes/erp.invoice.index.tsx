import { createFileRoute } from "@tanstack/react-router";
import InvoicesPage from "../components/erp/InvoicesPage";

export const Route = createFileRoute("/erp/invoice/")({
  component: InvoicesPage,
  head: () => ({
    meta: [
      { title: "Invoice | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
