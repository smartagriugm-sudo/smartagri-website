import { createFileRoute } from "@tanstack/react-router";
import BookingDetailPage from "../components/erp/BookingDetailPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/bookings/$id")({
  component: Page,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Reservasi | agrosphere" : "Booking | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <BookingDetailPage key={id} id={id} />;
}
