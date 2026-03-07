import { createFileRoute } from "@tanstack/react-router";
import { Cms } from "@/features/cms";

export const Route = createFileRoute("/_authenticated/cms/")({
  component: Cms,
});
