import { z } from "zod";

/**
 * AI Agent 操作日志 Schema
 */
export const agentActionLogSchema = z.object({
  id: z.string(),
  systemUserId: z.string(),
  intent: z.string(),
  inputMessage: z.string(),
  extractedData: z.string().nullable(),
  actionResult: z.string().nullable(),
  success: z.boolean(),
  createdAt: z.string(),
});

export type AgentActionLog = z.infer<typeof agentActionLogSchema>;

/**
 * 企业微信用户映射 Schema
 */
export const wechatUserMappingSchema = z.object({
  id: z.string(),
  wechatUserId: z.string(),
  wechatUserName: z.string().nullable(),
  systemUserId: z.string().nullable(),
  systemUserName: z.string().nullable(),
  isActive: z.boolean(),
});

export type WechatUserMapping = z.infer<typeof wechatUserMappingSchema>;

/**
 * AI Agent 配置 Schema
 */
export const agentConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["zhipu", "deepseek", "openai"]),
  model: z.string(),
  apiKey: z.string().optional(),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

/**
 * AI Agent 响应 Schema
 */
export const agentResponseSchema = z.object({
  content: z.string(),
  intent: z.string().optional(),
  needMoreInfo: z.boolean().optional(),
  missingFields: z.array(z.string()).optional(),
  result: z.record(z.string(), z.unknown()).optional(),
});

export type AgentResponse = z.infer<typeof agentResponseSchema>;

/**
 * 分页查询参数
 */
export const paginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/**
 * 操作日志查询参数
 */
export const queryActionLogsSchema = paginationParamsSchema.extend({
  intent: z.string().optional(),
  success: z.boolean().optional(),
});

export type QueryActionLogsParams = z.infer<typeof queryActionLogsSchema>;
