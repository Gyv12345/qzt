import { createFileRoute } from "@tanstack/react-router";
import { CmsPageEditorPage } from "@/features/cms/pages/cms-page-editor-page";

export const Route = createFileRoute("/_authenticated/cms/pages/edit/$pageId")({
  component: CmsPageEditPage,
});

function CmsPageEditPage() {
  const { pageId } = Route.useParams();
  return <CmsPageEditorPage mode="edit" pageId={pageId} />;
}
