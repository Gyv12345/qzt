import { createFileRoute } from "@tanstack/react-router";
import { ContractTemplatesPage } from "@/features/contract-templates";

export const Route = createFileRoute("/_authenticated/contract-templates")({
  component: ContractTemplatesPage,
});
