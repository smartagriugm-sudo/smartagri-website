import { createFileRoute } from "@tanstack/react-router";
import AuditPage from "../components/erp/AuditPage";

export const Route = createFileRoute("/erp/settings/audit")({
  component: AuditPage,
  head: () => ({
    meta: [
      { title: "Audit log | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
