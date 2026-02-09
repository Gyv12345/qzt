/**
 * 页面元素管理页面
 * 用于管理网站页面元素（如横幅、区块、组件等）
 */

import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Layout, Plus } from "lucide-react";

export function CmsElementsPage() {
  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">页面元素管理</h2>
          <p className="text-muted-foreground">
            管理网站页面元素，如横幅、区块、组件等可复用内容
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新建元素
        </Button>
      </div>

      {/* 占位内容 */}
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed">
        <Layout className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <div className="text-muted-foreground mb-2">页面元素管理功能开发中</div>
        <div className="text-sm text-muted-foreground/70">
          此功能将用于管理网站的可复用页面元素
        </div>
      </div>
    </Main>
  );
}
