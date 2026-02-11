import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  useWebhookConfigs,
  useDeleteWebhookConfig,
  useUpdateWebhookConfig,
  useTestWebhook,
  getPlatformLabel,
  getPlatformIcon,
  type WebhookConfig,
} from "../hooks/use-webhooks";
import { WebhookConfigFormDrawer } from "./webhook-config-form-drawer";
import type { TestWebhookDto } from "@/models";

export function WebhookConfigsTable() {
  const { data: configs, isLoading } = useWebhookConfigs();
  const deleteMutation = useDeleteWebhookConfig();
  const updateMutation = useUpdateWebhookConfig();
  const testMutation = useTestWebhook();

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [editingConfig, setEditingConfig] = useState<WebhookConfig | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

  const handleEdit = (config: WebhookConfig) => {
    setEditingConfig(config);
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfigId(id);
  };

  const confirmDelete = () => {
    if (deleteConfigId) {
      deleteMutation.mutate(deleteConfigId);
      setDeleteConfigId(null);
    }
  };

  const handleToggleEnabled = (config: WebhookConfig) => {
    updateMutation.mutate({
      id: config.id,
      data: { enabled: !config.enabled },
    });
  };

  const handleTest = (config: WebhookConfig) => {
    const testDto: TestWebhookDto = {
      webhookUrl: config.webhookUrl,
      platform: config.platform,
    };
    testMutation.mutate(testDto);
  };

  const handleSubmit = (data: any) => {
    if (editingConfig) {
      updateMutation.mutate(
        { id: editingConfig.id, data },
        {
          onSuccess: () => {
            setIsDrawerOpen(false);
            setEditingConfig(null);
          },
        },
      );
    }
  };

  const columns: ColumnDef<WebhookConfig>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            配置名称
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => row.getValue("name"),
    },
    {
      accessorKey: "platform",
      header: "平台",
      cell: ({ row }) => {
        const platform = row.getValue("platform") as string;
        return (
          <Badge variant="outline" className="gap-1">
            <span>{getPlatformIcon(platform)}</span>
            {getPlatformLabel(platform)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "webhookUrl",
      header: "Webhook URL",
      cell: ({ row }) => {
        const url = row.getValue("webhookUrl") as string;
        const truncated = url.length > 40 ? url.substring(0, 40) + "..." : url;
        return (
          <span className="text-muted-foreground" title={url}>
            {truncated}
          </span>
        );
      },
    },
    {
      accessorKey: "enabled",
      header: "状态",
      cell: ({ row }) => {
        const config = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={() => handleToggleEnabled(config)}
              disabled={updateMutation.isPending}
            />
            {config.enabled ? (
              <Badge variant="default" className="bg-green-500">
                启用
              </Badge>
            ) : (
              <Badge variant="secondary">禁用</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "创建时间",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleString("zh-CN");
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const config = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleTest(config)}
                disabled={testMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                测试发送
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(config)}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(config.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: configs || [],
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无 Webhook 配置
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 编辑抽屉 */}
      <WebhookConfigFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        editingConfig={editingConfig}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteConfigId}
        onOpenChange={(open) => !open && setDeleteConfigId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此 Webhook 配置吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
