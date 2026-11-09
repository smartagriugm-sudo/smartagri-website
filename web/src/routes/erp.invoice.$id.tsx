import { createFileRoute } from "@tanstack/react-router";
import { InvoiceDetailPage } from "../components/erp/SalesDocuments";

export const Route = createFileRoute("/erp/invoice/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Invoice | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <InvoiceDetailPage key={id} id={id} />;
}
