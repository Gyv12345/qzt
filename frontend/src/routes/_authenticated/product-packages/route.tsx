import { createFileRoute } from "@tanstack/react-router";
import { ProductPackagesPage } from "@/features/product-packages";

export const Route = createFileRoute("/_authenticated/product-packages")({
  component: ProductPackagesPage,
});
