import { createFileRoute } from "@tanstack/react-router";
import TracePage from "../components/erp/TracePage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/trace")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => (typeof search.code === "string" ? { code: search.code } : {}),
  component: Page,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Telusur | agrosphere" : "Trace | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { code } = Route.useSearch();
  return <TracePage code={code} />;
}
