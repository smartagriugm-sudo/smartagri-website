import { createFileRoute } from "@tanstack/react-router";
import RolesPage from "../components/erp/RolesPage";

export const Route = createFileRoute("/erp/settings/roles")({
  component: RolesPage,
  head: () => ({
    meta: [
      { title: "User roles | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
