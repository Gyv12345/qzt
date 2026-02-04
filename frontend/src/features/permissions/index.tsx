import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PermissionTable } from './components/permission-table'

export function Permissions() {
  return (
    <>
      <Header fixed>
        <div className="ml-auto flex items-center space-x-4" />
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">权限管理</h1>
        </div>

        <PermissionTable />
      </Main>
    </>
  )
}
