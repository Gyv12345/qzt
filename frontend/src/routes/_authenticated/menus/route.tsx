import { createFileRoute } from "@tanstack/react-router";
import { Menus } from "@/features/menus";

export const Route = createFileRoute("/_authenticated/menus")({
  component: Menus,
});
