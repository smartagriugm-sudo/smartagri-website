import { createFileRoute } from "@tanstack/react-router";
import CropsPage from "../components/erp/CropsPage";

export const Route = createFileRoute("/erp/tanaman")({
  component: CropsPage,
  head: () => ({
    meta: [
      { title: "Tanaman | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
