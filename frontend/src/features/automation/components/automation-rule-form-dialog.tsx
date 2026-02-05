import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useCreateAutomationRule, useUpdateAutomationRule } from '../hooks/use-automation'
import type { AutomationRule } from '../types/automation'

// 自动化规则表单验证 schema
const automationRuleFormSchema = z.object({
  name: z.string().min(1, '规则名称不能为空'),
  trigger: z.string().min(1, '触发条件不能为空'),
  action: z.string().min(1, '执行动作不能为空'),
  enabled: z.boolean().optional(),
})

type AutomationRuleFormValues = z.infer<typeof automationRuleFormSchema>

interface AutomationRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: AutomationRule
  onSuccess: () => void
}

export function AutomationRuleFormDialog({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: AutomationRuleFormDialogProps) {
  const isEdit = !!rule

  const form = useForm<AutomationRuleFormValues>({
    resolver: zodResolver(automationRuleFormSchema),
    defaultValues: rule
      ? {
          name: rule.name,
          trigger: rule.trigger,
          action: rule.action,
          enabled: rule.enabled,
        }
      : {
          name: '',
          trigger: '',
          action: '',
          enabled: true,
        },
  })

  // 重置表单当对话框打开/关闭时
  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  const createMutation = useCreateAutomationRule()
  const updateMutation = useUpdateAutomationRule()

  const onSubmit = async (values: AutomationRuleFormValues) => {
    try {
      const cleanedValues = {
        ...values,
        enabled: values.enabled ?? true,
      }

      if (isEdit && rule) {
        await updateMutation.mutateAsync({ id: rule.id, data: cleanedValues as any })
      } else {
        await createMutation.mutateAsync(cleanedValues as any)
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('提交失败:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑自动化规则' : '新建自动化规则'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改自动化规则配置' : '配置自动化规则，设置触发条件和执行动作'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>规则名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder='请输入规则名称' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='trigger'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>触发条件 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='描述触发条件，例如：每天上午9点、合同到期前7天、新客户注册时'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='action'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>执行动作 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='描述执行动作，例如：发送邮件提醒、更新客户状态、创建跟进任务'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>启用规则</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      禁用的规则不会自动执行，但可以手动触发
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '提交中...'
                  : isEdit
                    ? '保存'
                    : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
