import { getRouteApi } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { PaymentsPrimaryButtons } from './components/payments-primary-buttons'
import { PaymentsTable } from './components/payments-table'
import { PaymentsDialogs, usePaymentsDialogs } from './components/payments-dialogs'

const route = getRouteApi('/_authenticated/payments')

function PaymentsContent() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const { openCreateDialog, openEditDialog } = usePaymentsDialogs()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
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
            <h2 className='text-2xl font-bold tracking-tight'>收款管理</h2>
            <p className='text-muted-foreground'>
              管理收款记录和凭证上传
            </p>
          </div>
          <PaymentsPrimaryButtons onCreate={openCreateDialog} />
        </div>
        <PaymentsTable
          search={search}
          navigate={navigate}
          onEdit={openEditDialog}
          onRefresh={handleRefresh}
        />
      </Main>
    </>
  )
}

export function Payments() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  return (
    <PaymentsDialogs onRefresh={handleRefresh}>
      <PaymentsContent />
    </PaymentsDialogs>
  )
}
