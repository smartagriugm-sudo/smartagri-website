import { createFileRoute } from "@tanstack/react-router";
import AuditPage from "../components/erp/AuditPage";

export const Route = createFileRoute("/erp/pengaturan/audit")({
  component: AuditPage,
  head: () => ({
    meta: [
      { title: "Audit log | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
