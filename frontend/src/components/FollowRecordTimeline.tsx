import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFollowRecords, createFollowRecord } from '@/services/follow-record';
import type { FollowRecord, FollowType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Phone, MessageCircle, Home, Mail, MoreHorizontal } from 'lucide-react';

interface FollowRecordTimelineProps {
  customerId: string;
}

export function FollowRecordTimeline({ customerId }: FollowRecordTimelineProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FollowType>(FollowType.PHONE);
  const [content, setContent] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['followRecords', customerId],
    queryFn: () => getFollowRecords(customerId),
  });

  const createMutation = useMutation({
    mutationFn: createFollowRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followRecords', customerId] });
      setOpen(false);
      setContent('');
      setType(FollowType.PHONE);
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;

    createMutation.mutate({
      customerId,
      type,
      content,
    });
  };

  const getFollowTypeIcon = (type: FollowType) => {
    const icons = {
      [FollowType.PHONE]: Phone,
      [FollowType.WECHAT]: MessageCircle,
      [FollowType.VISIT]: Home,
      [FollowType.EMAIL]: Mail,
      [FollowType.OTHER]: MoreHorizontal,
    };
    return icons[type] || MoreHorizontal;
  };

  const getFollowTypeLabel = (type: FollowType) => {
    const labels = {
      [FollowType.PHONE]: '电话',
      [FollowType.WECHAT]: '微信',
      [FollowType.VISIT]: '上门',
      [FollowType.EMAIL]: '邮件',
      [FollowType.OTHER]: '其他',
    };
    return labels[type] || '其他';
  };

  const getFollowTypeColor = (type: FollowType) => {
    const colors = {
      [FollowType.PHONE]: 'bg-blue-100 text-blue-700',
      [FollowType.WECHAT]: 'bg-green-100 text-green-700',
      [FollowType.VISIT]: 'bg-purple-100 text-purple-700',
      [FollowType.EMAIL]: 'bg-orange-100 text-orange-700',
      [FollowType.OTHER]: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || colors[FollowType.OTHER];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">跟进记录</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              添加记录
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加跟进记录</DialogTitle>
              <DialogDescription>记录客户跟进情况</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">跟进类型</Label>
                <Select value={String(type)} onValueChange={(v) => setType(Number(v) as FollowType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择跟进类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(FollowType.PHONE)}>电话</SelectItem>
                    <SelectItem value={String(FollowType.WECHAT)}>微信</SelectItem>
                    <SelectItem value={String(FollowType.VISIT)}>上门</SelectItem>
                    <SelectItem value={String(FollowType.EMAIL)}>邮件</SelectItem>
                    <SelectItem value={String(FollowType.OTHER)}>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">跟进内容</Label>
                <Input
                  id="content"
                  placeholder="请输入跟进内容"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? '提交中...' : '提交'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无跟进记录</div>
      ) : (
        <div className="space-y-4">
          {records.map((record: FollowRecord) => {
            const Icon = getFollowTypeIcon(record.type);
            const colorClass = getFollowTypeColor(record.type);

            return (
              <div key={record.id} className="flex gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.user?.name || '未知用户'}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {getFollowTypeLabel(record.type)} · {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mt-2">{record.content}</p>
                  {record.nextTime && (
                    <p className="text-sm text-gray-500 mt-2">
                      下次跟进时间: {new Date(record.nextTime).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
