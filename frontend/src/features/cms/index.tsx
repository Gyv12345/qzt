/**
 * CMS 内容管理主页面
 *
 * TODO(human): 此页面需要等待 API 生成后完成以下步骤：
 * 1. 在 hooks/use-cms-contents.ts 中替换 mockCmsApi 为实际 API 调用
 * 2. 实现完整的组件功能（见下方注释）
 * 3. 添加路由配置
 * 4. 添加菜单配置
 */

import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Briefcase, Package, Users, Tags } from "lucide-react";
import { useCmsContentsByType } from "./hooks/use-cms-contents";
import { CONTENT_TYPE_CONFIG, type ContentType } from "./types/cms";

const route = getRouteApi("/_authenticated/cms");

// TODO(human): 实现以下组件
// import { CmsContentsTable } from "./components/cms-contents-table";
// import { CmsContentFormDrawer } from "./components/cms-content-form-drawer";
// import { CmsTagsManager } from "./components/cms-tags-manager";
// import { CmsDrawers, useCmsDrawers } from "./components/cms-drawers";

export function Cms() {
  const { t } = useTranslation();
  const search = route.useSearch();

  // 获取各类型内容数据
  const { data: articles, isLoading: articlesLoading } = useCmsContentsByType(
    "ARTICLE",
    search,
  );
  const { data: cases, isLoading: casesLoading } = useCmsContentsByType(
    "CASE_STUDY",
    search,
  );
  const { data: products, isLoading: productsLoading } = useCmsContentsByType(
    "PRODUCT_SHOWCASE",
    search,
  );
  const { data: profiles, isLoading: profilesLoading } = useCmsContentsByType(
    "PROFILE",
    search,
  );

  const isLoading =
    articlesLoading || casesLoading || productsLoading || profilesLoading;

  // TODO(human): 实现抽屉控制
  // const { openCreateDrawer, openEditDrawer } = useCmsDrawers();

  const handleCreate = (type: ContentType) => {
    console.log("创建内容:", type);
    // TODO(human): 调用 openCreateDrawer(type)
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
        <div className="flex gap-2">
          {/* TODO(human): 实现标签管理按钮 */}
          <Button variant="outline">
            <Tags className="mr-2 h-4 w-4" />
            标签管理
          </Button>
        </div>
      </div>

      {/* 内容类型标签页 */}
      <Tabs defaultValue="ARTICLE" className="flex-1">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="ARTICLE">
              <FileText className="mr-2 h-4 w-4" />
              文章
              {!articlesLoading && articles && (
                <span className="ml-2 text-muted-foreground">
                  ({articles.total})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="CASE_STUDY">
              <Briefcase className="mr-2 h-4 w-4" />
              案例
              {!casesLoading && cases && (
                <span className="ml-2 text-muted-foreground">
                  ({cases.total})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="PRODUCT_SHOWCASE">
              <Package className="mr-2 h-4 w-4" />
              产品展示
              {!productsLoading && products && (
                <span className="ml-2 text-muted-foreground">
                  ({products.total})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="PROFILE">
              <Users className="mr-2 h-4 w-4" />
              人员介绍
              {!profilesLoading && profiles && (
                <span className="ml-2 text-muted-foreground">
                  ({profiles.total})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 新建按钮 */}
          <Button onClick={() => handleCreate("ARTICLE")}>
            <Plus className="mr-2 h-4 w-4" />
            新建内容
          </Button>
        </div>

        {/* 文章标签页 */}
        <TabsContent value="ARTICLE" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">
                {articles && articles.total > 0
                  ? `共 ${articles.total} 篇文章`
                  : "暂无文章，点击上方按钮创建第一篇文章"}
              </p>
              {/* TODO(human): 替换为 CmsContentsTable 组件 */}
              {/* <CmsContentsTable data={articles?.data || []} onEdit={openEditDrawer} /> */}
            </div>
          )}
        </TabsContent>

        {/* 案例标签页 */}
        <TabsContent value="CASE_STUDY" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              <Briefcase className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">
                {cases && cases.total > 0
                  ? `共 ${cases.total} 个案例`
                  : "暂无案例，点击上方按钮创建第一个案例"}
              </p>
            </div>
          )}
        </TabsContent>

        {/* 产品展示标签页 */}
        <TabsContent value="PRODUCT_SHOWCASE" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">
                {products && products.total > 0
                  ? `共 ${products.total} 个产品展示`
                  : "暂无产品展示，点击上方按钮创建第一个产品展示"}
              </p>
            </div>
          )}
        </TabsContent>

        {/* 人员介绍标签页 */}
        <TabsContent value="PROFILE" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">
                {profiles && profiles.total > 0
                  ? `共 ${profiles.total} 个人物介绍`
                  : "暂无人员介绍，点击上方按钮创建第一个人员介绍"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* TODO(human): 添加内容编辑抽屉 */}
      {/* <CmsDrawers onRefresh={() => {}}> */}
      {/*   <CmsContentFormDrawer /> */}
      {/* </CmsDrawers> */}
    </Main>
  );
}
