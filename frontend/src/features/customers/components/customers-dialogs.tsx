import { useState, createContext, useContext } from "react";
import { CustomerFormDrawer } from "./customer-form-drawer";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { CustomersImportDialog } from "./customers-import-dialog";
import { CustomersExportDialog } from "./customers-export-dialog";
import type { Customer } from "../types/customer";

interface CustomersDialogsContextValue {
  openCreateDialog: () => void;
  openEditDialog: (customer: Customer) => void;
  openDetailDialog: (customerId: string) => void;
  openImportDialog: () => void;
  openExportDialog: () => void;
}

const CustomersDialogsContext =
  createContext<CustomersDialogsContextValue | null>(null);

interface CustomersDialogsProps {
  children: React.ReactNode;
  onRefresh: () => void;
  currentFilters?: {
    keyword?: string;
    customerLevel?: string;
    followUserId?: string;
  };
}

export function CustomersDialogs({
  children,
  onRefresh,
  currentFilters,
}: CustomersDialogsProps) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (customer: Customer) => setEditingCustomer(customer);
  const openDetailDialog = (customerId: string) =>
    setDetailCustomerId(customerId);
  const openImportDialog = () => setIsImportDialogOpen(true);
  const openExportDialog = () => setIsExportDialogOpen(true);

  return (
    <CustomersDialogsContext.Provider
      value={{
        openCreateDialog,
        openEditDialog,
        openDetailDialog,
        openImportDialog,
        openExportDialog,
      }}
    >
      {children}

      {/* 创建客户抽屉 */}
      <CustomerFormDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          onRefresh();
        }}
      />

      {/* 编辑客户抽屉 */}
      {editingCustomer && (
        <CustomerFormDrawer
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          customer={editingCustomer}
          onSuccess={() => {
            setEditingCustomer(null);
            onRefresh();
          }}
        />
      )}

      {/* 客户详情抽屉 */}
      {detailCustomerId && (
        <CustomerDetailDrawer
          open={!!detailCustomerId}
          onOpenChange={(open) => !open && setDetailCustomerId(null)}
          customerId={detailCustomerId}
        />
      )}

      {/* 导入客户对话框 */}
      <CustomersImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={onRefresh}
      />

      {/* 导出客户对话框 */}
      <CustomersExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        currentFilters={currentFilters}
      />
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
