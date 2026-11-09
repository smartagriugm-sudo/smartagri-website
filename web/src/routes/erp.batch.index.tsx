import { createFileRoute } from "@tanstack/react-router";
import BatchListPage from "../components/erp/BatchListPage";

export const Route = createFileRoute("/erp/batch/")({
  component: BatchListPage,
  head: () => ({
    meta: [
      { title: "Batch | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
