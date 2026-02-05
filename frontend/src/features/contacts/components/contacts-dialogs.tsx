import { useState, createContext, useContext } from 'react'
import { ContactFormDialog } from './contact-form-dialog'
import { LinkCustomerDialog } from './link-customer-dialog'
import type { Contact } from '../types/contact'

interface ContactsDialogsContextValue {
  openCreateDialog: () => void
  openEditDialog: (contact: Contact) => void
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
  const [linkingContact, setLinkingContact] = useState<Contact | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const openEditDialog = (contact: Contact) => setEditingContact(contact)
  const openLinkCustomerDialog = (contact: Contact) => setLinkingContact(contact)
  const openCreateCustomerDialog = (contact: Contact) => {
    // TODO: 打开创建客户对话框，并预填联系人信息
    console.log('创建客户，从联系人:', contact)
  }

  return (
    <ContactsDialogsContext.Provider
      value={{ openCreateDialog, openEditDialog, openLinkCustomerDialog, openCreateCustomerDialog }}
    >
      {children}

      {/* 创建联系人对话框 */}
      <ContactFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false)
          onRefresh()
        }}
      />

      {/* 编辑联系人对话框 */}
      {editingContact && (
        <ContactFormDialog
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
          onSuccess={() => {
            setEditingContact(null)
            onRefresh()
          }}
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
