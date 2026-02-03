import { Card } from '@/components/ui/card';
import { Users, FileText, Package, TrendingUp, PlusCircle, FileTextIcon, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/services';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">加载失败</div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'contract':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'invoice':
        return <FileTextIcon className="h-4 w-4 text-purple-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100';
      case 'contract':
        return 'bg-green-100';
      case 'invoice':
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">首页</h1>
        <p className="text-gray-500 mt-1">欢迎来到企账通客户管理系统</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总客户数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.overview?.totalCustomers || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                本月新增 {stats?.monthly?.newCustomers || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">合同总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.overview?.totalContracts || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                本月新增 {stats?.monthly?.newContracts || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">产品总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.overview?.totalProducts || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">本月业绩</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ¥{((stats?.monthly?.contractAmount || 0) / 10000).toFixed(1)}万
              </p>
              <p className="text-xs text-orange-600 mt-1">
                开票 ¥{((stats?.monthly?.invoiceAmount || 0) / 10000).toFixed(1)}万
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <PlusCircle className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">新建客户</h3>
                <p className="text-sm text-gray-500 mt-1">添加新的客户信息</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => navigate('/contracts')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium text-gray-900">创建合同</h3>
                <p className="text-sm text-gray-500 mt-1">为客户创建新合同</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileTextIcon className="h-5 w-5 text-purple-600" />
              <div>
                <h3 className="font-medium text-gray-900">开票管理</h3>
                <p className="text-sm text-gray-500 mt-1">管理开票记录</p>
              </div>
            </div>
          </button>
        </div>
      </Card>

      {/* 最近活动 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
        <div className="space-y-4">
          {stats?.recentActivities?.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无活动记录</div>
          ) : (
            stats?.recentActivities?.map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.title}</p>
                  {activity.subtitle && (
                    <p className="text-xs text-gray-600 mt-1">{activity.subtitle}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.time), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
