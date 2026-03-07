import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type {
  CreateWebhookConfigDto,
  UpdateWebhookConfigDto,
  TestWebhookDto,
} from "@/models";

/**
 * Webhook 配置列表查询
 */
export function useWebhookConfigs() {
  return useQuery({
    queryKey: ["webhook-configs"],
    queryFn: async () => {
      const response = await getScrmApi().webhooksControllerFindConfigs();
      return (response ?? []) as WebhookConfig[];
    },
  });
}

/**
 * 创建 Webhook 配置
 */
export function useCreateWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWebhookConfigDto) => {
      return await getScrmApi().webhooksControllerCreateConfig(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast.success("Webhook 配置创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

/**
 * 更新 Webhook 配置
 */
export function useUpdateWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWebhookConfigDto;
    }) => {
      return await getScrmApi().webhooksControllerUpdateConfig(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast.success("Webhook 配置更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

/**
 * 删除 Webhook 配置
 */
export function useDeleteWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await getScrmApi().webhooksControllerRemoveConfig(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast.success("Webhook 配置删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}

/**
 * 测试 Webhook 发送
 */
export function useTestWebhook() {
  return useMutation({
    mutationFn: async (data: TestWebhookDto) => {
      return await getScrmApi().webhooksControllerTestSend(data);
    },
    onSuccess: () => {
      toast.success("测试消息发送成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "测试发送失败");
    },
  });
}

/**
 * Webhook 配置类型定义
 */
export interface WebhookConfig {
  id: string;
  name: string;
  platform: "wecom" | "feishu" | "dingtalk";
  webhookUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 平台选项
 */
export const PLATFORM_OPTIONS = [
  { value: "wecom", label: "企业微信" },
  { value: "feishu", label: "飞书" },
  { value: "dingtalk", label: "钉钉" },
] as const;

/**
 * 获取平台标签
 */
export function getPlatformLabel(platform: string): string {
  const option = PLATFORM_OPTIONS.find((opt) => opt.value === platform);
  return option?.label || platform;
}

/**
 * 获取平台图标
 */
export function getPlatformIcon(platform: string) {
  switch (platform) {
    case "wecom":
      return "💼";
    case "feishu":
      return "🚀";
    case "dingtalk":
      return "🔔";
    default:
      return "📡";
  }
}
