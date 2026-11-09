import { createFileRoute } from "@tanstack/react-router";
import TracePage from "../components/erp/TracePage";

export const Route = createFileRoute("/erp/trace")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => (typeof search.code === "string" ? { code: search.code } : {}),
  component: Page,
  head: () => ({
    meta: [
      { title: "Trace | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { code } = Route.useSearch();
  return <TracePage code={code} />;
}
