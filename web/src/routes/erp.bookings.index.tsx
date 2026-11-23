import { createFileRoute } from "@tanstack/react-router";
import BookingsPage from "../components/erp/BookingsPage";
import { headLang } from "../lib/i18n";

export const Route = createFileRoute("/erp/bookings/")({
  component: BookingsPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Reservasi | agrosphere" : "Bookings | agrosphere" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
