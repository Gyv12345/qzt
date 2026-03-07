import { createFileRoute } from "@tanstack/react-router";
import { CmsPagesPage } from "@/features/cms/pages-page";

export const Route = createFileRoute("/_authenticated/cms/pages")({
  component: CmsPagesPage,
});
