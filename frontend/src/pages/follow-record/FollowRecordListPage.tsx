import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { FollowRecord } from '@/types'

const FOLLOW_TYPE_MAP = {
  1: '电话',
  2: '微信',
  3: '上门',
  4: '邮件',
  5: '其他',
}

export const FollowRecordListPage = () => {
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FollowRecord | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    type: '',
    content: '',
    nextTime: '',
  })

  const fetchFollowRecords = async () => {
    setLoading(true)
    try {
      // TODO: 调用实际的 API
      // const response = await fetch('/api/follow-records')
      // const data = await response.json()
      // setFollowRecords(data)

      // 模拟数据
      setFollowRecords([
        {
          id: '1',
          customerId: 'cust-001',
          type: 1,
          content: '与客户沟通了产品需求',
          nextTime: '2025-02-10',
          createdAt: '2025-02-01T10:30:00Z',
        },
        {
          id: '2',
          customerId: 'cust-001',
          type: 2,
          content: '微信确认合同细节',
          nextTime: '2025-02-08',
          createdAt: '2025-01-28T15:20:00Z',
        },
      ] as any)
    } catch (error) {
      console.error('获取跟进记录失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    setFormData({
      customerId: '',
      type: '',
      content: '',
      nextTime: '',
    })
    setModalVisible(true)
  }

  const handleEdit = (record: FollowRecord) => {
    setEditingRecord(record)
    setFormData({
      customerId: record.customerId || '',
      type: String(record.type || ''),
      content: record.content || '',
      nextTime: record.nextTime ? record.nextTime.split('T')[0] : '',
    })
    setModalVisible(true)
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这条跟进记录吗？')) return

    // TODO: 调用实际的 API
    setFollowRecords(followRecords.filter((r) => r.id !== id))
  }

  const handleSubmit = async () => {
    try {
      // TODO: 调用实际的 API
      console.log('提交表单:', formData)

      if (editingRecord) {
        // 更新
        setFollowRecords(
          followRecords.map((r) =>
            r.id === editingRecord.id ? { ...r, ...formData } : r
          )
        )
      } else {
        // 新建
        const newRecord = {
          id: String(Date.now()),
          ...formData,
          type: Number(formData.type),
          createdAt: new Date().toISOString(),
        } as any
        setFollowRecords([newRecord, ...followRecords])
      }

      setModalVisible(false)
    } catch (error) {
      console.error('保存失败', error)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">跟进记录</h1>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          新建跟进记录
        </Button>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : followRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无跟进记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    客户ID
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    跟进类型
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    跟进内容
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    下次跟进时间
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    创建时间
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {followRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{record.customerId}</td>
                    <td className="py-3 px-4 text-sm">
                      {FOLLOW_TYPE_MAP[record.type as keyof typeof FOLLOW_TYPE_MAP] || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">{record.content}</td>
                    <td className="py-3 px-4 text-sm">{record.nextTime || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      {record.createdAt ? format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm') : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="h-8 px-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          className="h-8 px-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? '编辑跟进记录' : '新建跟进记录'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">客户 *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择客户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cust-001">示例客户</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">跟进类型 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择跟进类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">电话</SelectItem>
                  <SelectItem value="2">微信</SelectItem>
                  <SelectItem value="3">上门</SelectItem>
                  <SelectItem value="4">邮件</SelectItem>
                  <SelectItem value="5">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">跟进内容 *</Label>
              <Input
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入跟进内容"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextTime">下次跟进时间</Label>
              <Input
                id="nextTime"
                type="date"
                value={formData.nextTime}
                onChange={(e) => setFormData({ ...formData, nextTime: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisible(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
