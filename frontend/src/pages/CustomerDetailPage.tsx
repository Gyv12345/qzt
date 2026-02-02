import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCustomerDetail } from '@/services/customer';
import { useQuery } from '@tanstack/react-query';
import type { CustomerLevel } from '@/types';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  MapPin,
  User,
  Calendar,
  Edit,
} from 'lucide-react';
import { FollowRecordTimeline } from '@/components/FollowRecordTimeline';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerDetail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">客户不存在</div>
      </div>
    );
  }

  const getLevelBadge = (level: CustomerLevel) => {
    const badges = {
      [CustomerLevel.POTENTIAL]: { text: '潜在', className: 'bg-gray-100 text-gray-800' },
      [CustomerLevel.INTENTION]: { text: '意向', className: 'bg-blue-100 text-blue-800' },
      [CustomerLevel.FORMAL]: { text: '正式', className: 'bg-green-100 text-green-800' },
      [CustomerLevel.VIP]: { text: 'VIP', className: 'bg-yellow-100 text-yellow-800' },
    };
    return badges[level] || badges[CustomerLevel.POTENTIAL];
  };

  const levelBadge = getLevelBadge(customer.customerLevel);

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-500 mt-1">{customer.companyName || '个人客户'}</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/customers/${customer.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          编辑
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 客户信息卡片 */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">客户信息</h2>
                <span className={`px-2 py-1 rounded text-xs font-medium ${levelBadge.className}`}>
                  {levelBadge.text}
                </span>
              </div>

              <div className="space-y-3">
                {customer.companyName && (
                  <div className="flex items-start gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-gray-500">公司名称</p>
                      <p className="text-gray-900 font-medium">{customer.companyName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 text-sm">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-500">联系人</p>
                    <p className="text-gray-900 font-medium">{customer.contactName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-500">联系电话</p>
                    <p className="text-gray-900 font-medium">{customer.contactPhone}</p>
                  </div>
                </div>

                {customer.contactEmail && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-gray-500">联系邮箱</p>
                      <p className="text-gray-900 font-medium">{customer.contactEmail}</p>
                    </div>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-gray-500">地址</p>
                      <p className="text-gray-900 font-medium">{customer.address}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 text-sm">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-500">跟进人</p>
                    <p className="text-gray-900 font-medium">
                      {customer.followUser?.name || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-500">创建时间</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>

                {customer.remark && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">备注</p>
                    <p className="text-gray-700 text-sm">{customer.remark}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* 跟进记录 */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <FollowRecordTimeline customerId={customer.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}
