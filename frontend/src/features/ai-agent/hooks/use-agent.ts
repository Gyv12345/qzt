import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customInstance } from "@/services/api-client";
import type {
  AgentActionLog,
  QueryActionLogsParams,
  AgentResponse,
  WechatUserMapping,
  AgentConfig,
} from "../types/agent";

/**
 * 分页响应类型
 */
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 获取 AI Agent 操作日志
 */
export function useAgentLogs(params: QueryActionLogsParams) {
  return useQuery({
    queryKey: ["agent-logs", params],
    queryFn: async () => {
      return customInstance<PaginatedResponse<AgentActionLog>>({
        url: "/ai-agent/logs",
        method: "GET",
        params: {
          page: params.page,
          pageSize: params.pageSize,
          intent: params.intent,
          success: params.success,
        },
      });
    },
  });
}

/**
 * 发送测试消息给 AI Agent
 */
export function useSendTestMessage() {
  return useMutation({
    mutationFn: async (message: string): Promise<AgentResponse> => {
      return customInstance<AgentResponse>({
        url: "/ai-agent/chat",
        method: "GET",
        params: { message },
      });
    },
  });
}

/**
 * 获取企业微信用户映射列表
 */
export function useWechatUserMappings(params: {
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["wechat-user-mappings", params],
    queryFn: async () => {
      return customInstance<PaginatedResponse<WechatUserMapping>>({
        url: "/ai-agent/user-mappings",
        method: "GET",
        params: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
        },
      });
    },
  });
}

/**
 * 绑定企业微信用户到系统用户
 */
export function useBindWechatUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wechatUserId,
      systemUserId,
    }: {
      wechatUserId: string;
      systemUserId: string;
    }) => {
      return customInstance<{ success: boolean }>({
        url: "/ai-agent/user-mappings/bind",
        method: "POST",
        data: { wechatUserId, systemUserId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wechat-user-mappings"] });
    },
  });
}

/**
 * 解绑企业微信用户
 */
export function useUnbindWechatUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wechatUserId: string) => {
      return customInstance<{ success: boolean }>({
        url: "/ai-agent/user-mappings/unbind",
        method: "POST",
        data: { wechatUserId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wechat-user-mappings"] });
    },
  });
}

/**
 * 获取 AI Agent 配置
 */
export function useAgentConfig() {
  return useQuery({
    queryKey: ["agent-config"],
    queryFn: async () => {
      return customInstance<AgentConfig>({
        url: "/ai-agent/config",
        method: "GET",
      });
    },
  });
}

/**
 * 更新 AI Agent 配置
 */
export function useUpdateAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      enabled?: boolean;
      provider?: string;
      model?: string;
      apiKey?: string;
    }) => {
      return customInstance<AgentConfig & { message: string }>({
        url: "/ai-agent/config",
        method: "PUT",
        data: config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-config"] });
    },
  });
}
