import { getRouteApi } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'

const route = getRouteApi('/_authenticated/contacts')

export function Contacts() {
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
            <h2 className='text-2xl font-bold tracking-tight'>联系人管理</h2>
            <p className='text-muted-foreground'>
              管理您的联系人和企业关联信息
            </p>
          </div>
        </div>

        <div className='flex items-center justify-center rounded-md border py-32'>
          <div className='text-center'>
            <p className='text-lg font-medium'>联系人管理模块开发中</p>
            <p className='text-sm text-muted-foreground mt-2'>
              此模块将提供联系人 CRUD 功能、企业关联管理、手机号查找等功能
            </p>
          </div>
        </div>
      </Main>
    </>
  )
}
