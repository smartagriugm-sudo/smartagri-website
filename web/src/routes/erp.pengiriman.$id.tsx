import { createFileRoute } from "@tanstack/react-router";
import { DeliveryNotePage } from "../components/erp/SalesDocuments";

export const Route = createFileRoute("/erp/pengiriman/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Surat jalan | smartagri ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <DeliveryNotePage key={id} id={id} />;
}
