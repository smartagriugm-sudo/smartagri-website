import { createFileRoute } from "@tanstack/react-router";
import BookingDetailPage from "../components/erp/BookingDetailPage";

export const Route = createFileRoute("/erp/bookings/$id")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Booking | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  return <BookingDetailPage key={id} id={id} />;
}
