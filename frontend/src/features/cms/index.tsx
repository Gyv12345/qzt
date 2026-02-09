/**
 * CMS 内容管理主页面
 */

import { useState, useCallback } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Main } from "@/components/layout/main";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Briefcase, Package, Users, Tags, Plus } from "lucide-react";
import { useCmsContentsByType } from "./hooks/use-cms-contents";
import {
  CmsContentsTable,
  CmsTagsManager,
  CmsDrawers,
  useCmsDrawers,
} from "./components";

const route = getRouteApi("/_authenticated/cms");

export function Cms() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [tagsManagerOpen, setTagsManagerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取各类型内容数据
  const {
    data: articles,
    isLoading: articlesLoading,
    error: articlesError,
  } = useCmsContentsByType("ARTICLE", search);
  const {
    data: cases,
    isLoading: casesLoading,
    error: casesError,
  } = useCmsContentsByType("CASE_STUDY", search);
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useCmsContentsByType("PRODUCT_SHOWCASE", search);
  const {
    data: profiles,
    isLoading: profilesLoading,
    error: profilesError,
  } = useCmsContentsByType("PROFILE", search);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleManageTags = useCallback(() => {
    setTagsManagerOpen(true);
  }, []);

  return (
    <CmsDrawers onRefresh={handleRefresh}>
      <CmsContentManager
        search={search}
        articles={articles}
        articlesLoading={articlesLoading}
        cases={cases}
        casesLoading={casesLoading}
        products={products}
        productsLoading={productsLoading}
        profiles={profiles}
        profilesLoading={profilesLoading}
        onManageTags={handleManageTags}
        refreshKey={refreshKey}
        onRefresh={handleRefresh}
      />
      <CmsTagsManager
        open={tagsManagerOpen}
        onOpenChange={setTagsManagerOpen}
        onSuccess={handleRefresh}
      />
    </CmsDrawers>
  );
}

// 导出为 CmsIndex 用于索引路由
export { Cms as CmsIndex };

interface CmsContentManagerProps {
  search: Record<string, unknown>;
  articles: any;
  articlesLoading: boolean;
  cases: any;
  casesLoading: boolean;
  products: any;
  productsLoading: boolean;
  profiles: any;
  profilesLoading: boolean;
  onManageTags: () => void;
  refreshKey: number;
  onRefresh: () => void;
}

function CmsContentManager({
  search,
  articles,
  articlesLoading,
  cases,
  casesLoading,
  products,
  productsLoading,
  profiles,
  profilesLoading,
  onManageTags,
  refreshKey,
  onRefresh,
}: CmsContentManagerProps) {
  const { openCreateDrawer, openEditDrawer } = useCmsDrawers();
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
          <Button variant="outline" onClick={onManageTags}>
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
          <Button onClick={() => openCreateDrawer("ARTICLE")}>
            <Plus className="mr-2 h-4 w-4" />
            新建内容
          </Button>
        </div>

        {/* 文章标签页 */}
        <TabsContent value="ARTICLE" className="mt-4 flex-1">
          <CmsContentsTable
            key={`articles-${refreshKey}`}
            data={articles?.data || []}
            total={articles?.total || 0}
            isLoading={articlesLoading}
            search={search}
            navigate={route.navigate}
            onEdit={openEditDrawer}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* 案例标签页 */}
        <TabsContent value="CASE_STUDY" className="mt-4 flex-1">
          <CmsContentsTable
            key={`cases-${refreshKey}`}
            data={cases?.data || []}
            total={cases?.total || 0}
            isLoading={casesLoading}
            search={search}
            navigate={route.navigate}
            onEdit={openEditDrawer}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* 产品展示标签页 */}
        <TabsContent value="PRODUCT_SHOWCASE" className="mt-4 flex-1">
          <CmsContentsTable
            key={`products-${refreshKey}`}
            data={products?.data || []}
            total={products?.total || 0}
            isLoading={productsLoading}
            search={search}
            navigate={route.navigate}
            onEdit={openEditDrawer}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* 人员介绍标签页 */}
        <TabsContent value="PROFILE" className="mt-4 flex-1">
          <CmsContentsTable
            key={`profiles-${refreshKey}`}
            data={profiles?.data || []}
            total={profiles?.total || 0}
            isLoading={profilesLoading}
            search={search}
            navigate={route.navigate}
            onEdit={openEditDrawer}
            onRefresh={onRefresh}
          />
        </TabsContent>
      </Tabs>
    </Main>
  );
}
