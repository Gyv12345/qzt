import { createFileRoute } from "@tanstack/react-router";
import { CmsEditorPage } from "@/features/cms/pages/cms-editor-page";

export const Route = createFileRoute("/_authenticated/cms/edit/$id")({
  component: CmsEditPage,
});

function CmsEditPage() {
  const { id } = Route.useParams();
  return <CmsEditorPage mode="edit" contentId={id} />;
}
