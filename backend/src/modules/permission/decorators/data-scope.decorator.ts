import { SetMetadata } from "@nestjs/common";

/**
 * 标记需要数据权限控制的接口
 * @param resource 资源类型，如 'customer', 'contract' 等
 */
export const DataScope = (resource: string) =>
  SetMetadata("dataScopeResource", resource);
