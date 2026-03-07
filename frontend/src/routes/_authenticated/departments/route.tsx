import { createFileRoute } from "@tanstack/react-router";
import { Departments } from "@/features/departments";

export const Route = createFileRoute("/_authenticated/departments")({
  component: Departments,
});
