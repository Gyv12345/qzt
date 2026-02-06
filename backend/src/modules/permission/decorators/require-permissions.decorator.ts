import { SetMetadata } from "@nestjs/common";

export const REQUIRE_PERMISSIONS_KEY = "requirePermissions";

/**
 * 权限装饰器 - 标记需要哪些权限才能访问
 * @param permissions 权限代码数组
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
