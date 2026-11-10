import { createFileRoute } from "@tanstack/react-router";
import { NewBookingPage } from "../components/erp/BookingsPage";

export const Route = createFileRoute("/erp/bookings/new")({
  component: NewBookingPage,
  head: () => ({
    meta: [
      { title: "New booking | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
