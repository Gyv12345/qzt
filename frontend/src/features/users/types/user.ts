/**
 * 用户类型定义
 * 重新导出 Orval 生成的类型
 */
export type { UserEntity } from "@/models";

// 为了向后兼容，创建 User 别名
export type { UserEntity as User } from "@/models";
