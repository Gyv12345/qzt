/**
 * 新媒体管理类型定义
 */

export type SocialMediaPlatform = "douyin" | "xiaohongshu" | "wechat";

export type SocialMediaPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type SocialMediaVisibility = "public" | "friends" | "private";

export interface SocialMediaAccount {
  id: string;
  platform: SocialMediaPlatform;
  accountName: string;
  accountId?: string;
  appId?: string;
  appSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  openId?: string;
  expiresAt?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaPost {
  id: string;
  accountId: string;
  title: string;
  content?: string;
  videoFileId?: string;
  videoUrl?: string;
  coverFileId?: string;
  coverUrl?: string;
  topics?: string;
  location?: string;
  visibility: SocialMediaVisibility;
  scheduledAt?: string;
  status: SocialMediaPostStatus;
  publishData?: string;
  error?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  account?: SocialMediaAccount;
}

export interface SocialMediaPublishLog {
  id: string;
  postId: string;
  platform: SocialMediaPlatform;
  accountId: string;
  status: "pending" | "publishing" | "success" | "failed";
  postIdOnPlatform?: string;
  postUrl?: string;
  error?: string;
  retryCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 平台配置
export const PLATFORM_CONFIG: Record<
  SocialMediaPlatform,
  { label: string; icon: string; color: string }
> = {
  douyin: { label: "抖音", icon: "Music", color: "#000000" },
  xiaohongshu: { label: "小红书", icon: "Heart", color: "#FF2442" },
  wechat: { label: "微信视频号", icon: "MessageCircle", color: "#07C160" },
};

// 内容状态配置
export const POST_STATUS_CONFIG: Record<
  SocialMediaPostStatus,
  { label: string; color: string; icon: string }
> = {
  draft: { label: "草稿", color: "default", icon: "FileEdit" },
  scheduled: { label: "定时中", color: "warning", icon: "Clock" },
  publishing: { label: "发布中", color: "info", icon: "Loader2" },
  published: { label: "已发布", color: "success", icon: "CheckCircle" },
  failed: { label: "失败", color: "destructive", icon: "XCircle" },
};

// 发布日志状态配置
export const PUBLISH_LOG_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "待发布", color: "default" },
  publishing: { label: "发布中", color: "info" },
  success: { label: "成功", color: "success" },
  failed: { label: "失败", color: "destructive" },
};
