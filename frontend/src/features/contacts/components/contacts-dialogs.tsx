import { useState, createContext, useContext } from "react";
import { ContactFormDrawer } from "./contact-form-drawer";
import { ContactDetailDrawer } from "./contact-detail-drawer";
import { LinkCustomerDialog } from "./link-customer-dialog";
import { ContactDeleteDialog } from "./contact-delete-dialog";
import { CustomerFormDrawer } from "@/features/customers/components/customer-form-drawer";
import { useLinkCustomer } from "../hooks/use-contacts";
import type { Contact } from "../types/contact";

// 从联系人创建客户的包装组件
interface CreateCustomerFromContactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onSuccess: () => void;
}

function CreateCustomerFromContact({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: CreateCustomerFromContactProps) {
  const linkMutation = useLinkCustomer();

  const handleCustomerCreated = async (customerId?: string) => {
    if (customerId) {
      try {
        await linkMutation.mutateAsync({
          contactId: contact.id,
          data: {
            customerId,
            isPrimary: true,
          },
        });
        onSuccess();
      } catch (error) {
        console.error("自动关联联系人失败:", error);
        onSuccess(); // 即使关联失败也关闭
      }
    } else {
      onSuccess();
    }
  };

  return (
    <CustomerFormDrawer
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={handleCustomerCreated}
    />
  );
}

interface ContactsDialogsContextValue {
  openCreateDialog: () => void;
  openEditDialog: (contact: Contact) => void;
  openDeleteDialog: (contact: Contact) => void;
  openDetailDrawer: (contact: Contact | null) => void;
  openLinkCustomerDialog: (contact: Contact) => void;
  openCreateCustomerDialog: (contact: Contact) => void;
}

const ContactsDialogsContext =
  createContext<ContactsDialogsContextValue | null>(null);

interface ContactsDialogsProps {
  children: React.ReactNode;
  onRefresh: () => void;
}

export function ContactsDialogs({ children, onRefresh }: ContactsDialogsProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [linkingContact, setLinkingContact] = useState<Contact | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creatingCustomerFromContact, setCreatingCustomerFromContact] =
    useState<Contact | null>(null);

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const openEditDialog = (contact: Contact) => setEditingContact(contact);
  const openDeleteDialog = (contact: Contact) => setDeletingContact(contact);
  const openDetailDrawer = (contact: Contact | null) =>
    setDetailContact(contact);
  const openLinkCustomerDialog = (contact: Contact) =>
    setLinkingContact(contact);
  const openCreateCustomerDialog = (contact: Contact) => {
    setCreatingCustomerFromContact(contact);
  };

  const handleCreateAndLinkSuccess = () => {
    setCreatingCustomerFromContact(null);
    onRefresh();
  };

  return (
    <ContactsDialogsContext.Provider
      value={{
        openCreateDialog,
        openEditDialog,
        openDeleteDialog,
        openDetailDrawer,
        openLinkCustomerDialog,
        openCreateCustomerDialog,
      }}
    >
      {children}

      {/* 创建联系人抽屉 */}
      <ContactFormDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          onRefresh();
        }}
      />

      {/* 编辑联系人抽屉 */}
      {editingContact && (
        <ContactFormDrawer
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
          onSuccess={() => {
            setEditingContact(null);
            onRefresh();
          }}
        />
      )}

      {/* 联系人详情抽屉 */}
      {detailContact && (
        <ContactDetailDrawer
          open={!!detailContact}
          onOpenChange={(open) => !open && setDetailContact(null)}
          contact={detailContact}
          onLinkCustomer={openLinkCustomerDialog}
          onCreateCustomer={openCreateCustomerDialog}
        />
      )}

      {/* 关联客户对话框 */}
      {linkingContact && (
        <LinkCustomerDialog
          open={!!linkingContact}
          onOpenChange={(open) => !open && setLinkingContact(null)}
          contact={linkingContact}
          onSuccess={() => {
            setLinkingContact(null);
            onRefresh();
          }}
        />
      )}

      {/* 删除联系人对话框 */}
      {deletingContact && (
        <ContactDeleteDialog
          open={!!deletingContact}
          onOpenChange={(open) => {
            if (!open) setDeletingContact(null);
          }}
          currentRow={deletingContact}
          onSuccess={() => {
            setDeletingContact(null);
            onRefresh();
          }}
        />
      )}

      {/* 从联系人创建客户抽屉 */}
      {creatingCustomerFromContact && (
        <CreateCustomerFromContact
          open={!!creatingCustomerFromContact}
          onOpenChange={(open) => {
            if (!open) setCreatingCustomerFromContact(null);
          }}
          contact={creatingCustomerFromContact}
          onSuccess={handleCreateAndLinkSuccess}
        />
      )}
    </ContactsDialogsContext.Provider>
  );
}

export function useContactsDialogs() {
  const context = useContext(ContactsDialogsContext);
  if (!context) {
    throw new Error("useContactsDialogs must be used within ContactsDialogs");
  }
  return context;
}
