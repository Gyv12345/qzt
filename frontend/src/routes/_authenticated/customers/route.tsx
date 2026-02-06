import { createFileRoute } from "@tanstack/react-router";
import { Customers } from "@/features/customers";

export const Route = createFileRoute("/_authenticated/customers")({
  component: Customers,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
    name: String(search.name ?? ""),
    customerLevel: search.customerLevel
      ? String(search.customerLevel).split(",")
      : [],
  }),
});
