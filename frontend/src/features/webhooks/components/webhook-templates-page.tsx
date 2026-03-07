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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Send,
  Eye,
  FileText,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface WebhookTemplate {
  id: string;
  name: string;
  code: string;
  platform: string;
  messageType: string;
  content: string;
  variables: string | null;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const PLATFORMS = [
  { value: "all", label: "所有平台", icon: "🌐" },
  { value: "wecom", label: "企业微信", icon: "💼" },
  { value: "feishu", label: "飞书", icon: "🚀" },
  { value: "dingtalk", label: "钉钉", icon: "🔔" },
];

const MESSAGE_TYPES = [
  { value: "text", label: "文本" },
  { value: "markdown", label: "Markdown" },
  { value: "card", label: "卡片" },
];

export function WebhookTemplatesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WebhookTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<WebhookTemplate | null>(null);
  const [sendingTemplate, setSendingTemplate] = useState<WebhookTemplate | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    platform: "all",
    messageType: "markdown",
    content: "",
    variables: "",
    description: "",
    enabled: true,
  });

  // 预览变量
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  // 获取模板列表
  const { data: templates, isLoading } = useQuery({
    queryKey: ["webhook-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/webhook/templates");
      return response.data.data as WebhookTemplate[];
    },
  });

  // 创建模板
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        variables: data.variables ? JSON.parse(data.variables) : undefined,
      };
      const response = await apiClient.post("/webhook/templates", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-templates"] });
      setIsCreateOpen(false);
      resetForm();
      toast.success("创建成功");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "创建失败");
    },
  });

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const payload = {
        ...data,
        variables: data.variables ? JSON.parse(data.variables) : undefined,
      };
      const response = await apiClient.put(`/webhook/templates/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-templates"] });
      setEditingTemplate(null);
      resetForm();
      toast.success("更新成功");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "更新失败");
    },
  });

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/webhook/templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-templates"] });
      setDeleteTemplateId(null);
      toast.success("删除成功");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "删除失败");
    },
  });

  // 切换状态
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/webhook/templates/${id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-templates"] });
      toast.success("状态已更新");
    },
  });

  // 预览模板
  const previewMutation = useMutation({
    mutationFn: async ({ code, variables }: { code: string; variables: Record<string, string> }) => {
      const response = await apiClient.post("/webhook/templates/preview", {
        templateCode: code,
        variables,
      });
      return response.data;
    },
  });

  // 发送模板消息
  const sendMutation = useMutation({
    mutationFn: async ({ code, variables }: { code: string; variables: Record<string, string> }) => {
      const response = await apiClient.post("/webhook/templates/send", {
        templateCode: code,
        variables,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "发送完成");
      setIsSendOpen(false);
      setSendingTemplate(null);
      setPreviewVariables({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "发送失败");
    },
  });

  // 初始化默认模板
  const initDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/webhook/templates/init-defaults");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-templates"] });
      toast.success("默认模板初始化完成");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      platform: "all",
      messageType: "markdown",
      content: "",
      variables: "",
      description: "",
      enabled: true,
    });
  };

  const handleEdit = (template: WebhookTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      code: template.code,
      platform: template.platform,
      messageType: template.messageType,
      content: template.content,
      variables: template.variables || "",
      description: template.description || "",
      enabled: template.enabled,
    });
  };

  const handlePreview = (template: WebhookTemplate) => {
    setPreviewingTemplate(template);
    // 解析变量
    if (template.variables) {
      try {
        const vars = JSON.parse(template.variables);
        const initialVars: Record<string, string> = {};
        Object.keys(vars).forEach((key) => {
          initialVars[key] = "";
        });
        setPreviewVariables(initialVars);
      } catch {
        setPreviewVariables({});
      }
    } else {
      setPreviewVariables({});
    }
    setIsPreviewOpen(true);
  };

  const handleSend = (template: WebhookTemplate) => {
    setSendingTemplate(template);
    // 解析变量
    if (template.variables) {
      try {
        const vars = JSON.parse(template.variables);
        const initialVars: Record<string, string> = {};
        Object.keys(vars).forEach((key) => {
          initialVars[key] = "";
        });
        setPreviewVariables(initialVars);
      } catch {
        setPreviewVariables({});
      }
    } else {
      setPreviewVariables({});
    }
    setIsSendOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePreviewSubmit = () => {
    if (previewingTemplate) {
      previewMutation.mutate({
        code: previewingTemplate.code,
        variables: previewVariables,
      });
    }
  };

  const handleSendSubmit = () => {
    if (sendingTemplate) {
      sendMutation.mutate({
        code: sendingTemplate.code,
        variables: previewVariables,
      });
    }
  };

  const getPlatformLabel = (platform: string) => {
    return PLATFORMS.find((p) => p.value === platform)?.label || platform;
  };

  const getMessageTypeLabel = (type: string) => {
    return MESSAGE_TYPES.find((t) => t.value === type)?.label || type;
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
          <h2 className="text-2xl font-bold tracking-tight">消息模板</h2>
          <p className="text-muted-foreground">管理 Webhook 消息模板，支持变量替换</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => initDefaultsMutation.mutate()}
            disabled={initDefaultsMutation.isPending}
          >
            <FileText className="mr-2 h-4 w-4" />
            初始化默认模板
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模板名称</TableHead>
              <TableHead>模板代码</TableHead>
              <TableHead>平台</TableHead>
              <TableHead>消息类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates && templates.length > 0 ? (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-sm">
                      {template.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getPlatformLabel(template.platform)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getMessageTypeLabel(template.messageType)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={template.enabled}
                      onCheckedChange={() => toggleMutation.mutate(template.id)}
                      disabled={toggleMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {template.description || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(template.updatedAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        title="预览"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSend(template)}
                        title="发送"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTemplateId(template.id)}
                        title="删除"
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
                  暂无消息模板，点击"初始化默认模板"或"新建模板"开始
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog
        open={isCreateOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTemplate(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "编辑消息模板" : "新建消息模板"}
            </DialogTitle>
            <DialogDescription>
              创建可复用的消息模板，支持变量占位符 {"{{variable}}"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="新客户通知"
                />
              </div>

              <div className="space-y-2">
                <Label>模板代码 *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="new_customer_notify"
                  disabled={!!editingTemplate}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>平台</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) =>
                    setFormData({ ...formData, platform: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>消息类型</Label>
                <Select
                  value={formData.messageType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, messageType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>模板内容 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="## 通知&#10;&#10;客户名称：{{customerName}}&#10;时间：{{createdAt}}"
                rows={8}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                使用 {"{{变量名}}"} 格式定义变量，发送时会被替换
              </p>
            </div>

            <div className="space-y-2">
              <Label>变量定义 (JSON)</Label>
              <Textarea
                value={formData.variables}
                onChange={(e) =>
                  setFormData({ ...formData, variables: e.target.value })
                }
                placeholder='{"customerName": {"type": "string", "description": "客户名称"}}'
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="模板用途说明"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>启用模板</Label>
                <p className="text-sm text-muted-foreground">
                  禁用后将无法使用此模板发送消息
                </p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTemplate(null);
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
              {editingTemplate ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>预览模板</DialogTitle>
            <DialogDescription>
              填写变量值，查看渲染后的消息内容
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {previewingTemplate && (
              <>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">原始模板</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm">
                    {previewingTemplate.content}
                  </pre>
                </div>

                {Object.keys(previewVariables).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">变量值</p>
                    {Object.keys(previewVariables).map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="w-32">{key}</Label>
                        <Input
                          value={previewVariables[key]}
                          onChange={(e) =>
                            setPreviewVariables({
                              ...previewVariables,
                              [key]: e.target.value,
                            })
                          }
                          placeholder={`输入 ${key}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handlePreviewSubmit} disabled={previewMutation.isPending}>
                  {previewMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  预览渲染结果
                </Button>

                {previewMutation.data && (
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">渲染结果</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm">
                      {previewMutation.data.data?.rendered}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发送对话框 */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>发送消息</DialogTitle>
            <DialogDescription>
              填写变量值，发送到所有启用的 Webhook 配置
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {sendingTemplate && (
              <>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">
                    模板: {sendingTemplate.name} ({sendingTemplate.code})
                  </p>
                </div>

                {Object.keys(previewVariables).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">变量值</p>
                    {Object.keys(previewVariables).map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="w-32">{key}</Label>
                        <Input
                          value={previewVariables[key]}
                          onChange={(e) =>
                            setPreviewVariables({
                              ...previewVariables,
                              [key]: e.target.value,
                            })
                          }
                          placeholder={`输入 ${key}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSendSubmit} disabled={sendMutation.isPending}>
              {sendMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Send className="mr-2 h-4 w-4" />
              发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此消息模板吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTemplateId && deleteMutation.mutate(deleteTemplateId)
              }
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
