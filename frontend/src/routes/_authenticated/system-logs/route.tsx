import { createFileRoute } from "@tanstack/react-router";
import { SystemLogsPage } from "@/features/system-logs";

export const Route = createFileRoute("/_authenticated/system-logs")({
  component: SystemLogsPage,
});
