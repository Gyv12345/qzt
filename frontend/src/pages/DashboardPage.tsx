import { Card } from '@/components/ui/card';
import { Users, FileText, Package, TrendingUp } from 'lucide-react';

export function DashboardPage() {
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
              <p className="text-2xl font-bold text-gray-900 mt-1">128</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">56</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">32</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">¥128,000</p>
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
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <h3 className="font-medium text-gray-900">新建客户</h3>
            <p className="text-sm text-gray-500 mt-1">添加新的客户信息</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <h3 className="font-medium text-gray-900">创建合同</h3>
            <p className="text-sm text-gray-500 mt-1">为客户创建新合同</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <h3 className="font-medium text-gray-900">跟进记录</h3>
            <p className="text-sm text-gray-500 mt-1">添加客户跟进记录</p>
          </button>
        </div>
      </Card>

      {/* 最近活动 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">新增客户: XX科技有限公司</p>
              <p className="text-xs text-gray-500 mt-1">2小时前</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">创建合同: CT202601001</p>
              <p className="text-xs text-gray-500 mt-1">5小时前</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">新增产品: 企业版年度服务</p>
              <p className="text-xs text-gray-500 mt-1">昨天</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
