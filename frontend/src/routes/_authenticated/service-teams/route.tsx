import { createFileRoute } from "@tanstack/react-router";
import { ServiceTeamsPage } from "@/features/service-teams";

export const Route = createFileRoute("/_authenticated/service-teams")({
  component: ServiceTeamsPage,
});
