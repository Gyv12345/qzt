import { getRouteApi } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { useTranslation } from 'react-i18next'
import { ContactsPrimaryButtons } from './components/contacts-primary-buttons'
import { ContactsTable } from './components/contacts-table'
import { ContactsDialogs, useContactsDialogs } from './components/contacts-dialogs'

const route = getRouteApi('/_authenticated/contacts')

function ContactsContent() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const {
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    openDetailDrawer,
    openLinkCustomerDialog,
    openCreateCustomerDialog,
  } = useContactsDialogs()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{t('contact.title')}</h2>
            <p className='text-muted-foreground'>{t('contact.description')}</p>
          </div>
          <ContactsPrimaryButtons onCreate={openCreateDialog} onImportSuccess={handleRefresh} />
        </div>
        <ContactsTable
          search={search}
          navigate={navigate}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          onOpenDetail={openDetailDrawer}
          onRefresh={handleRefresh}
          onLinkCustomer={openLinkCustomerDialog}
          onCreateCustomer={openCreateCustomerDialog}
        />
      </Main>
    </>
  )
}

export function Contacts() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
  }

  return (
    <ContactsDialogs onRefresh={handleRefresh}>
      <ContactsContent />
    </ContactsDialogs>
  )
}
