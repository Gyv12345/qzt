/**
 * 新媒体管理主页面
 *
 * TODO(human): 此页面需要完成以下组件：
 * 1. SocialMediaAccountsTable - 账号管理表格
 * 2. SocialMediaPostsTable - 内容列表表格
 * 3. SocialMediaPostEditor - 内容编辑器（支持富文本、视频上传）
 * 4. SocialMediaPublishDrawer - 发布设置抽屉
 * 5. SocialMediaCalendarView - 日历视图（可选）
 */

import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { Main } from "@/components/layout/main";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Calendar } from "lucide-react";
import {
  useSocialMediaAccounts,
  useSocialMediaPosts,
} from "./hooks/use-social-media";
import { PLATFORM_CONFIG } from "./types/social-media";

const route = getRouteApi("/_authenticated/social-media");

export function SocialMedia() {
  const search = route.useSearch();
  const [activeTab, setActiveTab] = useState("posts");

  // 获取账号列表
  const { data: accounts, isLoading: accountsLoading } =
    useSocialMediaAccounts();

  // 获取内容列表
  const { data: posts, isLoading: postsLoading } = useSocialMediaPosts(search);

  // TODO(human): 实现抽屉控制
  // const { openCreatePostDrawer, openCreateAccountDrawer } = useSocialMediaDrawers();

  const handleCreatePost = () => {
    console.log("创建内容");
    // TODO(human): 调用 openCreatePostDrawer()
  };

  const handleCreateAccount = () => {
    console.log("添加账号");
    // TODO(human): 调用 openCreateAccountDrawer()
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">新媒体管理</h2>
          <p className="text-muted-foreground">
            统一管理抖音、小红书、微信视频号等平台内容发布
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateAccount}>
            <Settings className="mr-2 h-4 w-4" />
            账号设置
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            日历视图
          </Button>
        </div>
      </div>

      {/* 已配置的平台状态 */}
      <div className="flex gap-4">
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
          const hasAccount = accounts?.data?.some(
            (a: any) => a.platform === key && a.status === 1,
          );
          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-md border px-4 py-2"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: hasAccount ? config.color : "#ccc",
                }}
              />
              <span className="text-sm">{config.label}</span>
              <span className="text-xs text-muted-foreground">
                {hasAccount ? "已配置" : "未配置"}
              </span>
            </div>
          );
        })}
      </div>

      {/* 功能标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="posts">
              内容列表
              {!postsLoading && posts && (
                <span className="ml-2 text-muted-foreground">
                  ({posts.total || 0})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="accounts">
              账号管理
              {!accountsLoading && accounts && (
                <span className="ml-2 text-muted-foreground">
                  ({accounts.total || 0})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 新建按钮 */}
          {activeTab === "posts" && (
            <Button onClick={handleCreatePost}>
              <Plus className="mr-2 h-4 w-4" />
              新建内容
            </Button>
          )}
        </div>

        {/* 内容列表标签页 */}
        <TabsContent value="posts" className="mt-4">
          {postsLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              <p className="mb-4">
                {posts && posts.total > 0
                  ? `共 ${posts.total} 条内容`
                  : "暂无内容，点击上方按钮创建第一条内容"}
              </p>
              {/* TODO(human): 替换为 SocialMediaPostsTable 组件 */}
              {/* <SocialMediaPostsTable data={posts?.data || []} /> */}
            </div>
          )}
        </TabsContent>

        {/* 账号管理标签页 */}
        <TabsContent value="accounts" className="mt-4">
          {accountsLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              <p className="mb-4">
                {accounts && accounts.total > 0
                  ? `共 ${accounts.total} 个账号`
                  : "暂无账号，点击上方按钮添加第一个账号"}
              </p>
              {/* TODO(human): 替换为 SocialMediaAccountsTable 组件 */}
              {/* <SocialMediaAccountsTable data={accounts?.data || []} /> */}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* TODO(human): 添加内容编辑抽屉 */}
      {/* <SocialMediaDrawers> */}
      {/*   <SocialMediaPostEditor /> */}
      {/*   <SocialMediaPublishDrawer /> */}
      {/* </SocialMediaDrawers> */}
    </Main>
  );
}
