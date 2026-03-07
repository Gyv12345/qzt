import { createFileRoute } from "@tanstack/react-router";
import { PaymentConfigPage } from "@/features/payments/components/payment-config-page";

export const Route = createFileRoute("/_authenticated/payments/config")({
  component: PaymentConfigPage,
});
