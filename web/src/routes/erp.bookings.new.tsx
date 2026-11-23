import { createFileRoute } from "@tanstack/react-router";
import { NewBookingPage } from "../components/erp/BookingsPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/bookings/new")({
  component: NewBookingPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Reservasi baru | agrosphere" : "New booking | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
