import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AutomationPrimaryButtons } from './components/automation-primary-buttons'
import { AutomationRulesTable } from './components/automation-rules-table'
import { AutomationDialogs, useAutomationDialogs } from './components/automation-dialogs'
import type { AutomationRule } from './types/automation'

function AutomationContent() {
  const queryClient = useQueryClient()
  const { openCreateDialog, openEditDialog } = useAutomationDialogs()
  const [activeTab, setActiveTab] = useState('rules')

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['automation'] })
  }

  const handleDelete = (rule: AutomationRule) => {
    if (window.confirm(`确定要删除自动化规则"${rule.name}"吗？此操作不可恢复。`)) {
      // 删除逻辑在表格组件中处理
      console.log('删除规则:', rule.id)
    }
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
            <h2 className='text-2xl font-bold tracking-tight'>自动化管理</h2>
            <p className='text-muted-foreground'>
              管理自动化规则和任务执行
            </p>
          </div>
          {activeTab === 'rules' && (
            <AutomationPrimaryButtons onCreate={openCreateDialog} />
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1'>
          <TabsList className='grid w-full max-w-md grid-cols-3'>
            <TabsTrigger value='rules'>自动化规则</TabsTrigger>
            <TabsTrigger value='notifications'>通知中心</TabsTrigger>
            <TabsTrigger value='history'>执行历史</TabsTrigger>
          </TabsList>

          <TabsContent value='rules' className='mt-4 h-[calc(100vh-300px)] overflow-auto'>
            <AutomationRulesTable
              onEdit={openEditDialog}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value='notifications' className='mt-4'>
            <div className='flex items-center justify-center rounded-md border py-32'>
              <div className='text-center'>
                <p className='text-lg font-medium'>通知中心</p>
                <p className='text-sm text-muted-foreground mt-2'>
                  查看自动化规则执行产生的通知
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='history' className='mt-4'>
            <div className='flex items-center justify-center rounded-md border py-32'>
              <div className='text-center'>
                <p className='text-lg font-medium'>执行历史</p>
                <p className='text-sm text-muted-foreground mt-2'>
                  查看自动化规则的执行历史记录
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

export function Automation() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['automation'] })
  }

  return (
    <AutomationDialogs onRefresh={handleRefresh}>
      <AutomationContent />
    </AutomationDialogs>
  )
}
