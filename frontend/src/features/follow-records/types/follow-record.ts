import { z } from "zod";
import { type ComponentType } from "react";
import {
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  MoreHorizontal,
} from "lucide-react";

/** 跟进类型枚举 */
export enum FollowType {
  PHONE = 1,
  WECHAT = 2,
  VISIT = 3,
  EMAIL = 4,
  OTHER = 5,
}

/** 跟进类型图标映射 */
export const FOLLOW_TYPE_ICONS: Record<
  FollowType,
  ComponentType<{ className?: string }>
> = {
  [FollowType.PHONE]: Phone,
  [FollowType.WECHAT]: MessageCircle,
  [FollowType.VISIT]: MapPin,
  [FollowType.EMAIL]: Mail,
  [FollowType.OTHER]: MoreHorizontal,
};

/** 跟进类型选项 */
export const FOLLOW_TYPE_OPTIONS = [
  { label: "电话", value: FollowType.PHONE },
  { label: "微信", value: FollowType.WECHAT },
  { label: "上门", value: FollowType.VISIT },
  { label: "邮件", value: FollowType.EMAIL },
  { label: "其他", value: FollowType.OTHER },
] as const;

/** 跟进记录 Schema */
export const followRecordSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "请选择客户"),
  type: z.nativeEnum(FollowType, { error: "请选择跟进类型" }),
  content: z.string().min(1, "请输入跟进内容"),
  nextTime: z.string().optional(),
  images: z.string().optional(),
});

export type FollowRecord = z.infer<typeof followRecordSchema>;

/** 跟进记录列表响应 */
export interface FollowRecordListResponse {
  data: FollowRecordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 跟进记录项（带关联数据） */
export interface FollowRecordItem extends FollowRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string;
  };
}

/** 跟进记录查询参数 */
export interface FollowRecordQueryParams {
  customerId?: string;
  page?: number;
  pageSize?: number;
}
