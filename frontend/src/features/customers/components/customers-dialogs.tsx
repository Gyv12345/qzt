import { useState, createContext, useContext } from "react";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerDetailDialog } from "./customer-detail-dialog";
import type { Customer } from "../types/customer";

interface CustomersDialogsContextValue {
  openCreateDialog: () => void;
  openEditDialog: (customer: Customer) => void;
  openDetailDialog: (customerId: string) => void;
}

const CustomersDialogsContext =
  createContext<CustomersDialogsContextValue | null>(null);

interface CustomersDialogsProps {
  children: React.ReactNode;
  onRefresh: () => void;
}

export function CustomersDialogs({
  children,
  onRefresh,
}: CustomersDialogsProps) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (customer: Customer) => setEditingCustomer(customer);
  const openDetailDialog = (customerId: string) =>
    setDetailCustomerId(customerId);

  return (
    <CustomersDialogsContext.Provider
      value={{ openCreateDialog, openEditDialog, openDetailDialog }}
    >
      {children}

      {/* 创建客户对话框 */}
      <CustomerFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          onRefresh();
        }}
      />

      {/* 编辑客户对话框 */}
      {editingCustomer && (
        <CustomerFormDialog
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          customer={editingCustomer}
          onSuccess={() => {
            setEditingCustomer(null);
            onRefresh();
          }}
        />
      )}

      {/* 客户详情对话框 */}
      {detailCustomerId && (
        <CustomerDetailDialog
          open={!!detailCustomerId}
          onOpenChange={(open) => !open && setDetailCustomerId(null)}
          customerId={detailCustomerId}
        />
      )}
    </CustomersDialogsContext.Provider>
  );
}

export function useCustomersDialogs() {
  const context = useContext(CustomersDialogsContext);
  if (!context) {
    throw new Error("useCustomersDialogs must be used within CustomersDialogs");
  }
  return context;
}
