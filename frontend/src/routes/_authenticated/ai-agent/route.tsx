import { createFileRoute } from "@tanstack/react-router";
import AiAgentPage from "@/features/ai-agent";

export const Route = createFileRoute("/_authenticated/ai-agent")({
  component: AiAgentPage,
});
