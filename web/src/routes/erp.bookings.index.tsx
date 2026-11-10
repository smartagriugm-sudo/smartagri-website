import { createFileRoute } from "@tanstack/react-router";
import BookingsPage from "../components/erp/BookingsPage";

export const Route = createFileRoute("/erp/bookings/")({
  component: BookingsPage,
  head: () => ({
    meta: [
      { title: "Bookings | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
