import { createFileRoute } from "@tanstack/react-router";
import { Contracts } from "@/features/contracts";

export const Route = createFileRoute("/_authenticated/contracts")({
  component: Contracts,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
    customerId: String(search.customerId ?? ""),
  }),
});
