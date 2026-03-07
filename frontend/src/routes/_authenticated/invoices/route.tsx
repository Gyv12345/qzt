import { createFileRoute } from "@tanstack/react-router";
import { Invoices } from "@/features/invoices";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: Invoices,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
  }),
});
