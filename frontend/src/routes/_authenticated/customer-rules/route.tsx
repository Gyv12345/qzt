import { createFileRoute } from "@tanstack/react-router";
import { CustomerRules } from "@/features/customer-rules";

export const Route = createFileRoute("/_authenticated/customer-rules")({
  component: CustomerRules,
});
