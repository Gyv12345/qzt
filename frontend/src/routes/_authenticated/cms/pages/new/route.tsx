import { createFileRoute } from "@tanstack/react-router";
import { CmsPageEditorPage } from "@/features/cms/pages/cms-page-editor-page";

export const Route = createFileRoute("/_authenticated/cms/pages/new")({
  component: CmsPageNewPage,
});

function CmsPageNewPage() {
  return <CmsPageEditorPage mode="new" />;
}
