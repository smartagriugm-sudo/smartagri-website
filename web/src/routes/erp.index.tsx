import { createFileRoute } from "@tanstack/react-router";

// The plant factory tab; ErpScreens in the layout draws it, so this route only
// holds the URL. ?hole=R1-T3-G1-H01 opens it on that hole, e.g. after a transplant.
export const Route = createFileRoute("/erp/")({
  validateSearch: (search: Record<string, unknown>): { hole?: string } =>
    typeof search.hole === "string" ? { hole: search.hole } : {},
  component: () => null,
});
