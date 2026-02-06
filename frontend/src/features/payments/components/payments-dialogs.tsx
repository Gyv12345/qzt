import { useState, createContext, useContext } from "react";
import { PaymentFormDialog } from "./payment-form-dialog";
import type { Payment } from "../types/payment";

interface PaymentsDialogsContextValue {
  openCreateDialog: () => void;
  openEditDialog: (payment: Payment) => void;
}

const PaymentsDialogsContext =
  createContext<PaymentsDialogsContextValue | null>(null);

interface PaymentsDialogsProps {
  children: React.ReactNode;
  onRefresh: () => void;
}

export function PaymentsDialogs({ children, onRefresh }: PaymentsDialogsProps) {
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (payment: Payment) => setEditingPayment(payment);

  return (
    <PaymentsDialogsContext.Provider
      value={{ openCreateDialog, openEditDialog }}
    >
      {children}

      {/* 创建收款记录对话框 */}
      <PaymentFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          onRefresh();
        }}
      />

      {/* 编辑收款记录对话框 */}
      {editingPayment && (
        <PaymentFormDialog
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
          payment={editingPayment}
          onSuccess={() => {
            setEditingPayment(null);
            onRefresh();
          }}
        />
      )}
    </PaymentsDialogsContext.Provider>
  );
}

export function usePaymentsDialogs() {
  const context = useContext(PaymentsDialogsContext);
  if (!context) {
    throw new Error("usePaymentsDialogs must be used within PaymentsDialogs");
  }
  return context;
}
