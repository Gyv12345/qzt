import { createFileRoute } from "@tanstack/react-router";
import { Payments } from "@/features/payments";

export const Route = createFileRoute("/_authenticated/payments")({
  component: Payments,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
  }),
});
