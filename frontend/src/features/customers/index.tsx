import { getRouteApi } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { CustomersPrimaryButtons } from './components/customers-primary-buttons'
import { CustomersTable } from './components/customers-table'
import { CustomersDialogs, useCustomersDialogs } from './components/customers-dialogs'

const route = getRouteApi('/_authenticated/customers')

function CustomersContent() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const { openCreateDialog, openEditDialog } = useCustomersDialogs()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <LanguageSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>客户管理</h2>
            <p className='text-muted-foreground'>
              管理您的客户信息和跟进记录
            </p>
          </div>
          <CustomersPrimaryButtons onCreate={openCreateDialog} />
        </div>
        <CustomersTable
          search={search}
          navigate={navigate}
          onEdit={openEditDialog}
          onRefresh={handleRefresh}
        />
      </Main>
    </>
  )
}

export function Customers() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }

  return (
    <CustomersDialogs onRefresh={handleRefresh}>
      <CustomersContent />
    </CustomersDialogs>
  )
}
