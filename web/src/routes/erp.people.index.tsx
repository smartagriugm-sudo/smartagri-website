import { createFileRoute } from "@tanstack/react-router";
import PeoplePage from "../components/erp/PeoplePage";

export const Route = createFileRoute("/erp/people/")({
  component: PeoplePage,
  head: () => ({
    meta: [
      { title: "People | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
