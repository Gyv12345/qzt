import { useState, createContext, useContext } from "react";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import type { Invoice } from "../types/invoice";

interface InvoicesDialogsContextValue {
  openCreateDialog: () => void;
  openEditDialog: (invoice: Invoice) => void;
}

const InvoicesDialogsContext =
  createContext<InvoicesDialogsContextValue | null>(null);

interface InvoicesDialogsProps {
  children: React.ReactNode;
  onRefresh: () => void;
}

export function InvoicesDialogs({ children, onRefresh }: InvoicesDialogsProps) {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (invoice: Invoice) => setEditingInvoice(invoice);

  return (
    <InvoicesDialogsContext.Provider
      value={{ openCreateDialog, openEditDialog }}
    >
      {children}

      {/* 创建开票记录对话框 */}
      <InvoiceFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          onRefresh();
        }}
      />

      {/* 编辑开票记录对话框 */}
      {editingInvoice && (
        <InvoiceFormDialog
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          invoice={editingInvoice}
          onSuccess={() => {
            setEditingInvoice(null);
            onRefresh();
          }}
        />
      )}
    </InvoicesDialogsContext.Provider>
  );
}

export function useInvoicesDialogs() {
  const context = useContext(InvoicesDialogsContext);
  if (!context) {
    throw new Error("useInvoicesDialogs must be used within InvoicesDialogs");
  }
  return context;
}
