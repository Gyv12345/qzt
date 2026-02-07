import { createFileRoute } from "@tanstack/react-router";
import { SocialMedia } from "@/features/social-media";

export const Route = createFileRoute("/_authenticated/social-media")({
  component: SocialMedia,
});
