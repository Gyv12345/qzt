import { createFileRoute } from "@tanstack/react-router";
import { Permissions } from "@/features/permissions";

export const Route = createFileRoute("/_authenticated/permissions")({
  component: Permissions,
});
