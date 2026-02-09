import { createFileRoute } from "@tanstack/react-router";
import { CmsElementsPage } from "@/features/cms/elements-page";

export const Route = createFileRoute("/_authenticated/cms/elements")({
  component: CmsElementsPage,
});
