import { createFileRoute } from "@tanstack/react-router";
import OrderDetailPage from "../components/erp/OrderDetailPage";

export const Route = createFileRoute("/erp/pesanan/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Pesanan | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <OrderDetailPage key={id} id={id} />;
}
