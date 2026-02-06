import { createFileRoute } from "@tanstack/react-router";
import { LoginLogs } from "@/features/login-logs";

export const Route = createFileRoute("/_authenticated/login-logs")({
  component: LoginLogs,
});
