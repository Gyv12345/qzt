import { useState } from "react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface PaymentConfig {
  id: string;
  paymentMethod: string;
  paymentChannel: string;
  appId: string | null;
  merchantId: string | null;
  status: number;
  sandbox: boolean;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_METHODS = [
  { value: "wechat", label: "微信支付", icon: "💚" },
  { value: "alipay", label: "支付宝", icon: "💙" },
];

const PAYMENT_CHANNELS: Record<string, { value: string; label: string }[]> = {
  wechat: [
    { value: "wechat_pay", label: "微信支付" },
    { value: "wechat_h5", label: "H5支付" },
    { value: "wechat_jsapi", label: "JSAPI支付" },
  ],
  alipay: [
    { value: "alipay_sign", label: "支付宝扫码" },
    { value: "alipay_h5", label: "H5支付" },
    { value: "alipay_app", label: "APP支付" },
  ],
};

export function PaymentConfigPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    paymentMethod: "wechat",
    paymentChannel: "wechat_pay",
    appId: "",
    appSecret: "",
    merchantId: "",
    apiKey: "",
    notifyUrl: "",
    returnUrl: "",
    sandbox: false,
  });

  // 获取配置列表
  const { data: configs, isLoading } = useQuery({
    queryKey: ["payment-configs"],
    queryFn: async () => {
      const response = await apiClient.get("/payment/configs");
      return response.data.data as PaymentConfig[];
    },
  });

  // 创建配置
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.post("/payment/configs", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      setIsCreateOpen(false);
      resetForm();
      toast.success("创建成功");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "创建失败");
    },
  });

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiClient.put(`/payment/configs/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      setEditingConfig(null);
      resetForm();
      toast.success("更新成功");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "更新失败");
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/payment/configs/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      setDeleteConfigId(null);
      toast.success("删除成功");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "删除失败");
    },
  });

  // 切换状态
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/payment/configs/${id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      toast.success("状态已更新");
    },
  });

  const resetForm = () => {
    setFormData({
      paymentMethod: "wechat",
      paymentChannel: "wechat_pay",
      appId: "",
      appSecret: "",
      merchantId: "",
      apiKey: "",
      notifyUrl: "",
      returnUrl: "",
      sandbox: false,
    });
  };

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config);
    setFormData({
      paymentMethod: config.paymentMethod,
      paymentChannel: config.paymentChannel,
      appId: config.appId || "",
      appSecret: "", // 敏感信息不返回
      merchantId: config.merchantId || "",
      apiKey: "", // 敏感信息不返回
      notifyUrl: "",
      returnUrl: "",
      sandbox: config.sandbox,
    });
  };

  const handleSubmit = () => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  const getChannelLabel = (method: string, channel: string) => {
    const channels = PAYMENT_CHANNELS[method] || [];
    return channels.find((c) => c.value === channel)?.label || channel;
  };

  if (isLoading) {
    return (
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Main>
    );
  }

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">支付配置</h2>
          <p className="text-muted-foreground">管理微信支付、支付宝的支付参数</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建配置
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>支付方式</TableHead>
              <TableHead>支付渠道</TableHead>
              <TableHead>应用ID</TableHead>
              <TableHead>商户号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>环境</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs && configs.length > 0 ? (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {getMethodLabel(config.paymentMethod)}
                    </div>
                  </TableCell>
                  <TableCell>{getChannelLabel(config.paymentMethod, config.paymentChannel)}</TableCell>
                  <TableCell className="font-mono text-sm">{config.appId || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{config.merchantId || "-"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={config.status === 1}
                      onCheckedChange={() => toggleMutation.mutate(config.id)}
                      disabled={toggleMutation.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.sandbox ? "secondary" : "default"}>
                      {config.sandbox ? "沙箱" : "生产"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(config.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfigId(config.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  暂无支付配置，点击"新建配置"开始
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog
        open={isCreateOpen || !!editingConfig}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingConfig(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "编辑支付配置" : "新建支付配置"}
            </DialogTitle>
            <DialogDescription>
              配置支付参数，敏感信息将被加密存储
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>支付方式 *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      paymentMethod: value,
                      paymentChannel: PAYMENT_CHANNELS[value]?.[0]?.value || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.icon} {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>支付渠道 *</Label>
                <Select
                  value={formData.paymentChannel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentChannel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(PAYMENT_CHANNELS[formData.paymentMethod] || []).map(
                      (channel) => (
                        <SelectItem key={channel.value} value={channel.value}>
                          {channel.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>应用ID (AppID)</Label>
                <Input
                  value={formData.appId}
                  onChange={(e) =>
                    setFormData({ ...formData, appId: e.target.value })
                  }
                  placeholder="wx1234567890abcdef"
                />
              </div>

              <div className="space-y-2">
                <Label>商户号 (MchID)</Label>
                <Input
                  value={formData.merchantId}
                  onChange={(e) =>
                    setFormData({ ...formData, merchantId: e.target.value })
                  }
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>应用密钥 (AppSecret)</Label>
              <Input
                type="password"
                value={formData.appSecret}
                onChange={(e) =>
                  setFormData({ ...formData, appSecret: e.target.value })
                }
                placeholder={editingConfig ? "留空保持不变" : "请输入应用密钥"}
              />
            </div>

            <div className="space-y-2">
              <Label>API密钥 (ApiKey)</Label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                placeholder={editingConfig ? "留空保持不变" : "请输入API密钥"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>回调通知URL</Label>
                <Input
                  value={formData.notifyUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, notifyUrl: e.target.value })
                  }
                  placeholder="https://example.com/api/webhook"
                />
              </div>

              <div className="space-y-2">
                <Label>返回URL</Label>
                <Input
                  value={formData.returnUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, returnUrl: e.target.value })
                  }
                  placeholder="https://example.com/payment/success"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>沙箱环境</Label>
                <p className="text-sm text-muted-foreground">
                  启用后将使用支付平台提供的沙箱环境进行测试
                </p>
              </div>
              <Switch
                checked={formData.sandbox}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sandbox: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingConfig(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingConfig ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteConfigId}
        onOpenChange={(open) => !open && setDeleteConfigId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此支付配置吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfigId && deleteMutation.mutate(deleteConfigId)}
              className="bg-destructive text-destructive-foreground"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  );
}
