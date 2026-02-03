import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormFieldWrapper } from '@/components/form/form-field'
import { customerSchema, type CustomerFormData } from '../schemas/customer-schema'

interface CustomerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
}

export function CustomerDrawer({
  open,
  onOpenChange,
  customerId,
}: CustomerDrawerProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      customerLevel: 'NORMAL',
      contact: '',
      phone: '',
      email: '',
      industry: '',
      address: '',
    },
  })

  const onSubmit = (data: CustomerFormData) => {
    // TODO: 实现创建/更新逻辑
    console.log(data)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {customerId ? '编辑客户' : '新增客户'}
          </SheetTitle>
          <SheetDescription>
            填写客户信息，带 * 号为必填项
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormFieldWrapper
              name="name"
              label="公司名称 *"
            >
              {({ field }) => (
                <Input placeholder="请输入公司名称" {...field} />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="customerLevel"
              label="客户等级 *"
            >
              {({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择客户等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="NORMAL">普通</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="contact"
              label="联系人 *"
            >
              {({ field }) => (
                <Input placeholder="请输入联系人姓名" {...field} />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="phone"
              label="联系电话 *"
            >
              {({ field }) => (
                <Input placeholder="请输入手机号" {...field} />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="email"
              label="邮箱"
            >
              {({ field }) => (
                <Input placeholder="请输入邮箱" {...field} />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="industry"
              label="行业"
            >
              {({ field }) => (
                <Input placeholder="请输入行业" {...field} />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="address"
              label="地址"
            >
              {({ field }) => (
                <Input placeholder="请输入地址" {...field} />
              )}
            </FormFieldWrapper>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit">
                保存
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
