import { createFileRoute } from "@tanstack/react-router";
import RolesPage from "../components/erp/RolesPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/settings/roles")({
  component: RolesPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Peran pengguna | agrosphere" : "User roles | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
