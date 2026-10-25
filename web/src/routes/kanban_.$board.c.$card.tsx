import { createFileRoute } from "@tanstack/react-router";
import CardModal from "../components/kanban/CardModal";

// Card detail as a modal over the board: the board route stays mounted and
// renders this through its <Outlet />, so the URL can be shared.
export const Route = createFileRoute("/kanban_/$board/c/$card")({
  component: CardRoute,
});

function CardRoute() {
  const { card } = Route.useParams();
  return <CardModal number={Number(card)} />;
}
