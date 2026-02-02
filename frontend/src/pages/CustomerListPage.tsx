import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { Customer, CustomerLevel } from '@/types';
import { getCustomers, deleteCustomer } from '@/services/customer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Building2,
  User,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CustomerListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', searchKeyword],
    queryFn: () =>
      getCustomers({
        keyword: searchKeyword,
        page: 1,
        pageSize: 100,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
    },
  });

  const getLevelBadge = (level: CustomerLevel) => {
    const badges = {
      [CustomerLevel.POTENTIAL]: { text: '潜在', className: 'bg-gray-100 text-gray-800' },
      [CustomerLevel.INTENTION]: { text: '意向', className: 'bg-blue-100 text-blue-800' },
      [CustomerLevel.FORMAL]: { text: '正式', className: 'bg-green-100 text-green-800' },
      [CustomerLevel.VIP]: { text: 'VIP', className: 'bg-yellow-100 text-yellow-800' },
    };
    return badges[level] || badges[CustomerLevel.POTENTIAL];
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  const customers = customersData?.data || [];

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
          <p className="text-gray-500 mt-1">管理您的客户信息</p>
        </div>
        <Button onClick={() => navigate('/customers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          新建客户
        </Button>
      </div>

      {/* 搜索框 */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索客户名称、联系人、公司名称..."
            className="pl-10"
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* 客户列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            加载中...
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无客户数据
          </div>
        ) : (
          customers.map((customer: Customer) => {
            const levelBadge = getLevelBadge(customer.customerLevel);
            return (
              <Card
                key={customer.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      {customer.companyName && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center">
                          <Building2 className="h-3 w-3 mr-1" />
                          {customer.companyName}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${levelBadge.className}`}>
                      {levelBadge.text}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>{customer.contactName}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{customer.contactPhone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${customer.id}`);
                      }}
                    >
                      查看详情
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${customer.id}/edit`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(customer.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个客户吗?此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
