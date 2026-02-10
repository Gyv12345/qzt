/**
 * 新媒体管理主页面
 *
 * 此页面提供以下功能：
 * 1. 账号管理 - 添加/编辑/删除社交媒体账号
 * 2. 内容管理 - 创建/编辑/发布/定时发布内容
 * 3. 平台状态显示 - 显示已配置的平台状态
 */

import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Main } from "@/components/layout/main";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Calendar } from "lucide-react";
import {
  useSocialMediaAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useRefreshToken,
  useSocialMediaPosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  usePublishPost,
  useSchedulePublish,
  useCancelScheduled,
} from "./hooks/use-social-media";
import { PLATFORM_CONFIG } from "./types/social-media";
import {
  SocialAccountsTable,
  SocialPostsTable,
  SocialPostEditorDrawer,
  SocialAccountFormDrawer,
} from "./components";

const route = getRouteApi("/_authenticated/social-media");

function SocialMediaContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const [activeTab, setActiveTab] = useState("posts");

  // 抽屉状态
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [postEditorOpen, setPostEditorOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<any>(null);

  // 删除确认对话框状态
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "account" | "post";
    item: any;
  }>({ open: false, type: "post", item: null });

  // 获取数据
  const { data: accounts, isLoading: accountsLoading } =
    useSocialMediaAccounts();
  const { data: posts, isLoading: postsLoading } = useSocialMediaPosts(search);

  // 账号操作 hooks
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const refreshTokenMutation = useRefreshToken();

  // 内容操作 hooks
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();
  const publishPostMutation = usePublishPost();
  const schedulePostMutation = useSchedulePublish();
  const cancelScheduleMutation = useCancelScheduled();

  // ==================== 账号管理操作 ====================

  const handleAddAccount = () => {
    setEditingAccount(null);
    setAccountFormOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setAccountFormOpen(true);
  };

  const handleDeleteAccount = (account: any) => {
    setDeleteDialog({ open: true, type: "account", item: account });
  };

  const confirmDeleteAccount = () => {
    if (deleteDialog.item) {
      deleteAccountMutation.mutate(deleteDialog.item.id, {
        onSuccess: () => {
          setDeleteDialog({ open: false, type: "account", item: null });
        },
      });
    }
  };

  const handleRefreshToken = (account: any) => {
    refreshTokenMutation.mutate(
      { id: account.id, platform: account.platform },
      {
        onSuccess: () => {
          // Toast 已在 hook 中处理
        },
      },
    );
  };

  const handleAccountFormSubmit = (data: any) => {
    if (editingAccount) {
      updateAccountMutation.mutate(
        { id: editingAccount.id, data },
        {
          onSuccess: () => {
            setAccountFormOpen(false);
          },
        },
      );
    } else {
      createAccountMutation.mutate(data, {
        onSuccess: () => {
          setAccountFormOpen(false);
        },
      });
    }
  };

  // ==================== 内容管理操作 ====================

  const handleCreatePost = () => {
    setEditingPost(null);
    setPostEditorOpen(true);
  };

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setPostEditorOpen(true);
  };

  const handleDeletePost = (post: any) => {
    setDeleteDialog({ open: true, type: "post", item: post });
  };

  const confirmDeletePost = () => {
    if (deleteDialog.item) {
      deletePostMutation.mutate(deleteDialog.item.id, {
        onSuccess: () => {
          setDeleteDialog({ open: false, type: "post", item: null });
        },
      });
    }
  };

  const handlePublishPost = (post: any) => {
    publishPostMutation.mutate({
      postId: post.id,
      accountId: post.accountId,
    });
  };

  const handleSchedulePost = (post: any) => {
    setEditingPost(post);
    setPostEditorOpen(true);
  };

  const handleCancelSchedule = (post: any) => {
    cancelScheduleMutation.mutate(post.id);
  };

  const handlePostFormSubmit = (data: any) => {
    if (editingPost) {
      // 更新现有内容
      updatePostMutation.mutate(
        { id: editingPost.id, data },
        {
          onSuccess: () => {
            // 如果设置了定时发布时间
            if (data.scheduledAt) {
              schedulePostMutation.mutate({
                postId: editingPost.id,
                scheduledAt: new Date(data.scheduledAt).toISOString(),
              });
            }
            setPostEditorOpen(false);
          },
        },
      );
    } else {
      // 创建新内容
      createPostMutation.mutate(data, {
        onSuccess: (result: any) => {
          // 如果设置了定时发布时间
          if (data.scheduledAt && result?.id) {
            schedulePostMutation.mutate({
              postId: result.id,
              scheduledAt: new Date(data.scheduledAt).toISOString(),
            });
          }
          setPostEditorOpen(false);
        },
      });
    }
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("socialMedia.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("socialMedia.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddAccount}>
            <Settings className="mr-2 h-4 w-4" />
            {t("socialMedia.accountSettings")}
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            {t("socialMedia.calendarView")}
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
                {hasAccount
                  ? t("socialMedia.configured")
                  : t("socialMedia.notConfigured")}
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
              {t("socialMedia.postsList")}
              {!postsLoading && posts && (
                <span className="ml-2 text-muted-foreground">
                  ({posts.total || 0})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="accounts">
              {t("socialMedia.accountManagement")}
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
              {t("socialMedia.newPost")}
            </Button>
          )}
        </div>

        {/* 内容列表标签页 */}
        <TabsContent value="posts" className="mt-4">
          <SocialPostsTable
            data={posts?.data || []}
            loading={postsLoading}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onPublish={handlePublishPost}
            onSchedule={handleSchedulePost}
            onCancelSchedule={handleCancelSchedule}
          />
        </TabsContent>

        {/* 账号管理标签页 */}
        <TabsContent value="accounts" className="mt-4">
          <SocialAccountsTable
            data={accounts?.data || []}
            loading={accountsLoading}
            onEdit={handleEditAccount}
            onDelete={handleDeleteAccount}
            onRefresh={handleRefreshToken}
          />
        </TabsContent>
      </Tabs>

      {/* 账号表单抽屉 */}
      <SocialAccountFormDrawer
        open={accountFormOpen}
        onClose={() => setAccountFormOpen(false)}
        onSubmit={handleAccountFormSubmit}
        editingAccount={editingAccount}
        loading={
          createAccountMutation.isPending || updateAccountMutation.isPending
        }
      />

      {/* 内容编辑器抽屉 */}
      <SocialPostEditorDrawer
        open={postEditorOpen}
        onClose={() => setPostEditorOpen(false)}
        onSubmit={handlePostFormSubmit}
        editingPost={editingPost}
        loading={createPostMutation.isPending || updatePostMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.type === "account"
                ? t("socialMedia.confirmDeleteAccount")
                : t("socialMedia.confirmDeletePost")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "account"
                ? t("socialMedia.deleteAccountWarning")
                : t("socialMedia.deletePostWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.type === "account") {
                  confirmDeleteAccount();
                } else {
                  confirmDeletePost();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  );
}

export function SocialMedia() {
  return <SocialMediaContent />;
}
