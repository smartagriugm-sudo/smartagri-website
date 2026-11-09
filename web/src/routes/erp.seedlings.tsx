import { createFileRoute } from "@tanstack/react-router";

// The growth chamber tab; ErpScreens in the layout draws it, so this route only
// holds the URL. ?slot=CH1-S1-P01 opens it on that tray, e.g. from a hole's origin.
export const Route = createFileRoute("/erp/seedlings")({
  validateSearch: (search: Record<string, unknown>): { slot?: string } =>
    typeof search.slot === "string" ? { slot: search.slot } : {},
  component: () => null,
  head: () => ({
    meta: [
      { title: "Seedlings | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
