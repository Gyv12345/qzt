import { useState, createContext, useContext } from 'react'
import { ContactFormDrawer } from './contact-form-drawer'
import { ContactDetailDrawer } from './contact-detail-drawer'
import { LinkCustomerDialog } from './link-customer-dialog'
import { ContactDeleteDialog } from './contact-delete-dialog'
import type { Contact } from '../types/contact'

interface ContactsDialogsContextValue {
  openCreateDialog: () => void
  openEditDialog: (contact: Contact) => void
  openDeleteDialog: (contact: Contact) => void
  openDetailDrawer: (contact: Contact | null) => void
  openLinkCustomerDialog: (contact: Contact) => void
  openCreateCustomerDialog: (contact: Contact) => void
}

const ContactsDialogsContext = createContext<ContactsDialogsContextValue | null>(null)

interface ContactsDialogsProps {
  children: React.ReactNode
  onRefresh: () => void
}

export function ContactsDialogs({ children, onRefresh }: ContactsDialogsProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [linkingContact, setLinkingContact] = useState<Contact | null>(null)
  const [detailContact, setDetailContact] = useState<Contact | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const openEditDialog = (contact: Contact) => setEditingContact(contact)
  const openDeleteDialog = (contact: Contact) => setDeletingContact(contact)
  const openDetailDrawer = (contact: Contact | null) => setDetailContact(contact)
  const openLinkCustomerDialog = (contact: Contact) => setLinkingContact(contact)
  const openCreateCustomerDialog = (contact: Contact) => {
    // TODO: 打开创建客户对话框，并预填联系人信息
    console.log('创建客户，从联系人:', contact)
  }

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
          setIsCreateDialogOpen(false)
          onRefresh()
        }}
      />

      {/* 编辑联系人抽屉 */}
      {editingContact && (
        <ContactFormDrawer
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
          onSuccess={() => {
            setEditingContact(null)
            onRefresh()
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
            setLinkingContact(null)
            onRefresh()
          }}
        />
      )}

      {/* 删除联系人对话框 */}
      {deletingContact && (
        <ContactDeleteDialog
          open={!!deletingContact}
          onOpenChange={(open) => {
            if (!open) setDeletingContact(null)
          }}
          currentRow={deletingContact}
          onSuccess={() => {
            setDeletingContact(null)
            onRefresh()
          }}
        />
      )}
    </ContactsDialogsContext.Provider>
  )
}

export function useContactsDialogs() {
  const context = useContext(ContactsDialogsContext)
  if (!context) {
    throw new Error('useContactsDialogs must be used within ContactsDialogs')
  }
  return context
}
