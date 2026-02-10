import { createFileRoute } from "@tanstack/react-router";
import { CmsEditorPage } from "@/features/cms/pages/cms-editor-page";

export const Route = createFileRoute("/_authenticated/cms/new")({
  component: CmsNewPage,
});

function CmsNewPage() {
  return <CmsEditorPage mode="new" />;
}
