import { createFileRoute } from "@tanstack/react-router";
import { OperationLogs } from "@/features/operation-logs";

export const Route = createFileRoute("/_authenticated/operation-logs")({
  component: OperationLogs,
});
