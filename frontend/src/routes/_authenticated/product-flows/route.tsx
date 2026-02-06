import { createFileRoute } from "@tanstack/react-router";
import { ProductFlowsPage } from "@/features/product-flows";

export const Route = createFileRoute("/_authenticated/product-flows")({
  component: ProductFlowsPage,
});
