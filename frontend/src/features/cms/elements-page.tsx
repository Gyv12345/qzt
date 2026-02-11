/**
 * 页面元素管理页面
 * 用于管理网站页面元素（如横幅、区块、组件等）
 */

import { useState, useCallback } from "react";
import { getRouteApi } from "@tanstack/react-router";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layout,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCmsContentsByType,
  useDeleteContent,
  usePublishContent,
  useUnpublishContent,
} from "./hooks/use-cms-contents";
import { ElementsFormDrawer } from "./components/elements-form-drawer";
import type { CmsContent } from "./types/cms";

const route = getRouteApi("/_authenticated/cms/elements");

// 预定义的页面元素模板
const ELEMENT_TEMPLATES: Array<{
  slug: string;
  title: string;
  description: string;
  defaultContent: string;
}> = [
  {
    slug: "homepage-hero",
    title: "首页 Hero 区域",
    description: "网站首页的主要横幅区域，包含标题、副标题和 CTA 按钮",
    defaultContent: JSON.stringify({
      badge: "全新升级 · 智能 CRM 系统",
      title: "企业客户管理",
      subtitle: "新时代的智能选择",
      description:
        "企智通为您提供一站式企业客户关系管理解决方案，助力企业实现数字化转型，提升运营效率。",
      ctaPrimaryText: "免费试用 30 天",
      ctaPrimaryUrl: "#contact",
      ctaSecondaryText: "观看演示",
      ctaSecondaryUrl: "/demo",
    }),
  },
];

export function CmsElementsPage() {
  const search = route.useSearch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<CmsContent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 使用 refreshKey 来强制重新渲染
  void refreshKey;

  const { data, isLoading } = useCmsContentsByType("PAGE_ELEMENT", {
    ...search,
    pageSize: 100,
  });

  const deleteMutation = useDeleteContent();
  const publishMutation = usePublishContent();
  const unpublishMutation = useUnpublishContent();

  const handleCreate = useCallback(() => {
    setEditingElement(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((element: CmsContent) => {
    setEditingElement(element);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (element: CmsContent) => {
      if (confirm(`确定要删除 "${element.title}" 吗？`)) {
        await deleteMutation.mutateAsync(element.id);
        setRefreshKey((prev) => prev + 1);
      }
    },
    [deleteMutation],
  );

  const handlePublish = useCallback(
    async (element: CmsContent) => {
      await publishMutation.mutateAsync(element.id);
      setRefreshKey((prev) => prev + 1);
    },
    [publishMutation],
  );

  const handleUnpublish = useCallback(
    async (element: CmsContent) => {
      await unpublishMutation.mutateAsync(element.id);
      setRefreshKey((prev) => prev + 1);
    },
    [unpublishMutation],
  );

  const handleCreateFromTemplate = useCallback(
    async (template: (typeof ELEMENT_TEMPLATES)[number]) => {
      try {
        // 这里需要调用创建 API，暂时先提示
        toast.info(
          `请使用新建功能创建 "${template.title}"，slug 为: ${template.slug}`,
        );
      } catch (error) {
        toast.error("创建失败");
      }
    },
    [],
  );

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingElement(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        {/* 页面标题 */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">页面元素管理</h2>
            <p className="text-muted-foreground">
              管理网站页面元素，如首页 Hero、CTA 区域等可复用内容
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建元素
          </Button>
        </div>

        {/* 快速创建模板 */}
        {!data?.data?.length && (
          <div className="rounded-lg border border-dashed p-6">
            <h3 className="mb-4 font-semibold">快速创建预设元素</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ELEMENT_TEMPLATES.map((template) => (
                <div
                  key={template.slug}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div>
                    <div className="font-medium">{template.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.slug}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    创建
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 元素列表 */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>标识</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : !data?.data?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    暂无页面元素，点击上方"新建元素"创建
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((element) => (
                  <TableRow key={element.id}>
                    <TableCell className="font-medium">
                      {element.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {element.slug}
                    </TableCell>
                    <TableCell>
                      {element.status === "PUBLISHED" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          已发布
                        </Badge>
                      ) : (
                        <Badge variant="secondary">草稿</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(element.updatedAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(element)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          {element.status === "PUBLISHED" ? (
                            <DropdownMenuItem
                              onClick={() => handleUnpublish(element)}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              取消发布
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handlePublish(element)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              发布
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(element)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 使用说明 */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
            <Layout className="h-4 w-4" />
            使用说明
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>页面元素用于存储网站各区域的可编辑内容</li>
            <li>
              首页 Hero 区域的标识为
              <code className="mx-1 rounded bg-white px-1.5 py-0.5">
                homepage-hero
              </code>
              ，content 字段存储 JSON 格式的配置
            </li>
            <li>编辑完成后需要发布才能在前端生效</li>
          </ul>
        </div>
      </Main>

      {/* 编辑抽屉 */}
      <ElementsFormDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        element={editingElement}
        onSuccess={handleRefresh}
        templates={ELEMENT_TEMPLATES}
      />
    </>
  );
}
