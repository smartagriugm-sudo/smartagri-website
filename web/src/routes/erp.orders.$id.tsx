import { createFileRoute } from "@tanstack/react-router";
import OrderDetailPage from "../components/erp/OrderDetailPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/orders/$id")({
  component: Page,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Pesanan | agrosphere" : "Orders | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <OrderDetailPage key={id} id={id} />;
}
