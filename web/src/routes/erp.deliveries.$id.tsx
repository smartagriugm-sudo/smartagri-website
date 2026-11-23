import { createFileRoute } from "@tanstack/react-router";
import { DeliveryNotePage } from "../components/erp/SalesDocuments";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/deliveries/$id")({
  component: Page,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Surat jalan | agrosphere" : "Delivery note | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <DeliveryNotePage key={id} id={id} />;
}
