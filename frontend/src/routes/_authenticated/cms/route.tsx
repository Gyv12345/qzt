import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cms")({
  component: CmsLayout,
});

function CmsLayout() {
  return (
    <div className="flex flex-1 flex-col">
      <Outlet />
    </div>
  );
}
