import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Overview } from './components/overview'
import { useDashboardStats } from './hooks/use-dashboard-stats'

export function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats()

  const statsData = stats?.data || {
    totalRevenue: 0,
    customerCount: 0,
    orderCount: 0,
    growth: 0,
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <h1 className='text-lg font-medium'>工作台</h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>总收入</CardTitle>
              <DollarSign className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='h-8 w-24 animate-pulse rounded bg-muted' />
              ) : (
                <>
                  <div className='text-2xl font-bold'>
                    ¥{statsData.totalRevenue?.toLocaleString() || '0'}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    较上月 +{statsData.growth || 0}%
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>客户数</CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='h-8 w-16 animate-pulse rounded bg-muted' />
              ) : (
                <>
                  <div className='text-2xl font-bold'>
                    {statsData.customerCount || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    本月新增
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>订单数</CardTitle>
              <ShoppingCart className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='h-8 w-16 animate-pulse rounded bg-muted' />
              ) : (
                <>
                  <div className='text-2xl font-bold'>
                    {statsData.orderCount || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    本月订单
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>增长率</CardTitle>
              <TrendingUp className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='h-8 w-16 animate-pulse rounded bg-muted' />
              ) : (
                <>
                  <div className='text-2xl font-bold'>
                    {statsData.growth || 0}%
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    较上月
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>数据概览</CardTitle>
          </CardHeader>
          <CardContent className='ps-2'>
            <Overview />
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
