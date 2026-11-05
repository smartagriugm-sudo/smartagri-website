import { createFileRoute } from "@tanstack/react-router";
import RolesPage from "../components/erp/RolesPage";

export const Route = createFileRoute("/erp/pengaturan/peran")({
  component: RolesPage,
  head: () => ({
    meta: [
      { title: "Peran pengguna | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
