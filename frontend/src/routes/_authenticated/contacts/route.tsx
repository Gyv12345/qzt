import { createFileRoute } from "@tanstack/react-router";
import { Contacts } from "@/features/contacts";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: Contacts,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    pageSize: Number(search.pageSize ?? 10),
  }),
});
