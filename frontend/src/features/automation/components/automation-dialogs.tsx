import { useState, createContext, useContext } from 'react'
import { AutomationRuleFormDialog } from './automation-rule-form-dialog'
import type { AutomationRule } from '../types/automation'

interface AutomationDialogsContextValue {
  openCreateDialog: () => void
  openEditDialog: (rule: AutomationRule) => void
}

const AutomationDialogsContext = createContext<AutomationDialogsContextValue | null>(null)

interface AutomationDialogsProps {
  children: React.ReactNode
  onRefresh: () => void
}

export function AutomationDialogs({ children, onRefresh }: AutomationDialogsProps) {
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const openEditDialog = (rule: AutomationRule) => setEditingRule(rule)

  return (
    <AutomationDialogsContext.Provider value={{ openCreateDialog, openEditDialog }}>
      {children}

      {/* 创建规则对话框 */}
      <AutomationRuleFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false)
          onRefresh()
        }}
      />

      {/* 编辑规则对话框 */}
      {editingRule && (
        <AutomationRuleFormDialog
          open={!!editingRule}
          onOpenChange={(open) => !open && setEditingRule(null)}
          rule={editingRule}
          onSuccess={() => {
            setEditingRule(null)
            onRefresh()
          }}
        />
      )}
    </AutomationDialogsContext.Provider>
  )
}

export function useAutomationDialogs() {
  const context = useContext(AutomationDialogsContext)
  if (!context) {
    throw new Error('useAutomationDialogs must be used within AutomationDialogs')
  }
  return context
}
