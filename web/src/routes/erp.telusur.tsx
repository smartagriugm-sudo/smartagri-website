import { createFileRoute } from "@tanstack/react-router";
import TracePage from "../components/erp/TracePage";

export const Route = createFileRoute("/erp/telusur")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => (typeof search.code === "string" ? { code: search.code } : {}),
  component: Page,
  head: () => ({
    meta: [
      { title: "Telusur | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { code } = Route.useSearch();
  return <TracePage code={code} />;
}
