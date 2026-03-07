/**
 * CMS 内容管理主页面
 */

import { useState, useCallback } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCmsContents } from "./hooks/use-cms-contents";
import { CmsContentsTable } from "./components";

const route = getRouteApi("/_authenticated/cms");

export function Cms() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取所有内容数据
  const { data: allContents, isLoading: contentsLoading } =
    useCmsContents(search);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // 导航到新建页面
  const handleCreate = useCallback(() => {
    navigate({ to: "/cms/new" });
  }, [navigate]);

  // 导航到编辑页面
  const handleEdit = useCallback(
    (content: { id: string }) => {
      navigate({ to: "/cms/edit/$id", params: { id: content.id } });
    },
    [navigate],
  );

  return (
    <CmsContentManager
      search={search}
      allContents={allContents}
      contentsLoading={contentsLoading}
      onCreate={handleCreate}
      onEdit={handleEdit}
      refreshKey={refreshKey}
      onRefresh={handleRefresh}
      navigate={navigate}
    />
  );
}

// 导出为 CmsIndex 用于索引路由
export { Cms as CmsIndex };

interface CmsContentManagerProps {
  search: Record<string, unknown>;
  allContents: any;
  contentsLoading: boolean;
  onCreate: () => void;
  onEdit: (content: { id: string }) => void;
  refreshKey: number;
  onRefresh: () => void;
  navigate: ReturnType<typeof route.useNavigate>;
}

function CmsContentManager({
  search,
  allContents,
  contentsLoading,
  onCreate,
  onEdit,
  refreshKey,
  onRefresh,
  navigate,
}: CmsContentManagerProps) {
  // 将 TanStack Router 的 navigate 转换为 NavigateFn 类型
  const tableNavigate: import("@/hooks/use-table-url-state").NavigateFn = (
    opts,
  ) => {
    navigate({
      search: opts.search as any,
      replace: opts.replace,
    });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">内容管理</h2>
          <p className="text-muted-foreground">
            管理网站文章、案例、产品展示和人员介绍等内容
          </p>
        </div>

        {/* 新建按钮 */}
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建内容
        </Button>
      </div>

      {/* 内容列表 */}
      <CmsContentsTable
        key={`contents-${refreshKey}`}
        data={allContents?.data || []}
        total={allContents?.total || 0}
        isLoading={contentsLoading}
        search={search}
        navigate={tableNavigate}
        onEdit={onEdit}
        onRefresh={onRefresh}
      />
    </Main>
  );
}
