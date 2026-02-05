import { useState, createContext, useContext } from 'react'
import { ContactFormDialog } from './contact-form-dialog'
import type { Contact } from '../types/contact'

interface ContactsDialogsContextValue {
  openCreateDialog: () => void
  openEditDialog: (contact: Contact) => void
}

const ContactsDialogsContext = createContext<ContactsDialogsContextValue | null>(null)

interface ContactsDialogsProps {
  children: React.ReactNode
  onRefresh: () => void
}

export function ContactsDialogs({ children, onRefresh }: ContactsDialogsProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const openEditDialog = (contact: Contact) => setEditingContact(contact)

  return (
    <ContactsDialogsContext.Provider value={{ openCreateDialog, openEditDialog }}>
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
