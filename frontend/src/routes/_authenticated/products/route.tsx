import { createFileRoute } from "@tanstack/react-router";
import { Products } from "@/features/products";

export const Route = createFileRoute("/_authenticated/products")({
  component: Products,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
  }),
});
