import { createFileRoute } from "@tanstack/react-router";
import PeoplePage from "../components/erp/PeoplePage";

export const Route = createFileRoute("/erp/orang")({
  component: PeoplePage,
  head: () => ({
    meta: [
      { title: "Orang | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
