import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取需要的权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置权限要求,则允许访问
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 从请求中获取用户(需要JwtStrategy在之前验证)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("未登录");
    }

    // 检查是否是超级管理员
    if (user.isAdmin) {
      return true;
    }

    // 检查用户是否拥有所需权限
    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException("权限不足");
    }

    return true;
  }
}
