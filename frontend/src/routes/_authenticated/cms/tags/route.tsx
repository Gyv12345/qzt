import { createFileRoute } from "@tanstack/react-router";
import { CmsTagsPage } from "@/features/cms/tags-page";

export const Route = createFileRoute("/_authenticated/cms/tags")({
  component: CmsTagsPage,
});
