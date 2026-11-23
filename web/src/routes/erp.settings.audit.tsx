import { createFileRoute } from "@tanstack/react-router";
import AuditPage from "../components/erp/AuditPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/settings/audit")({
  component: AuditPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Log audit | agrosphere" : "Audit log | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
