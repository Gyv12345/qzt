import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "@/common/prisma/prisma.service";

/**
 * 数据范围枚举
 */
export enum DataScope {
  ALL = "all", // 查看全部数据
  DEPARTMENT = "department", // 仅查看本部门数据
  DEPARTMENT_AND_SUB = "department_and_sub", // 查看本部门及下级部门数据
  SELF = "self", // 仅查看本人数据
}

@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取需要数据权限控制的资源类型
    const resource = this.reflector.get<string>(
      "dataScopeResource",
      context.getHandler(),
    );

    // 如果没有标记资源类型，则跳过数据权限控制
    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("未登录");
    }

    // 超级管理员跳过数据权限控制
    if (user.isAdmin) {
      // 在请求中附加数据范围信息，供后续使用
      request.dataScope = {
        type: DataScope.ALL,
        userIds: undefined,
        departmentIds: undefined,
      };
      return true;
    }

    // 获取用户的所有角色中最大的数据权限范围
    const maxScope = this.getMaxDataScope(user.roles || []);

    // 计算实际的数据范围
    const dataScope = await this.calculateDataScope(maxScope, user);

    // 将数据范围附加到请求对象，供后续查询使用
    request.dataScope = dataScope;

    return true;
  }

  /**
   * 获取用户所有角色中最大的数据权限范围
   */
  private getMaxDataScope(
    roles: Array<{
      dataScope: string;
      type: string;
    }>,
  ): string {
    // 过滤出系统角色（团队角色不参与数据权限控制）
    const systemRoles = roles.filter((r) => r.type === "system");

    if (systemRoles.length === 0) {
      return DataScope.SELF;
    }

    // 数据权限范围优先级：ALL > DEPARTMENT_AND_SUB > DEPARTMENT > CUSTOM > SELF
    const scopePriority = [
      DataScope.ALL,
      DataScope.DEPARTMENT_AND_SUB,
      DataScope.DEPARTMENT,
      DataScope.SELF,
    ];

    for (const scope of scopePriority) {
      if (systemRoles.some((r) => r.dataScope === scope)) {
        return scope;
      }
    }

    return DataScope.SELF;
  }

  /**
   * 计算实际的数据范围
   */
  private async calculateDataScope(
    dataScope: string,
    user: any,
  ): Promise<{
    type: string;
    userIds?: string[];
    departmentIds?: string[];
  }> {
    switch (dataScope) {
      case DataScope.ALL:
        return {
          type: DataScope.ALL,
        };

      case DataScope.DEPARTMENT:
        return {
          type: DataScope.DEPARTMENT,
          departmentIds: user.departmentId ? [user.departmentId] : [],
        };

      case DataScope.DEPARTMENT_AND_SUB:
        // 获取本部门及所有下级部门ID
        const subDeptIds = await this.getSubDepartmentIds(user.departmentId);
        return {
          type: DataScope.DEPARTMENT_AND_SUB,
          departmentIds: subDeptIds,
        };


      case DataScope.SELF:
      default:
        return {
          type: DataScope.SELF,
          userIds: [user.userId],
        };
    }
  }

  /**
   * 获取部门及所有下级部门ID
   */
  private async getSubDepartmentIds(departmentId: string): Promise<string[]> {
    const ids: string[] = [];

    if (!departmentId) {
      return ids;
    }

    // 递归获取所有下级部门
    const collectSubIds = async (parentId: string) => {
      ids.push(parentId);

      const children = await this.prisma.department.findMany({
        where: { parentId },
        select: { id: true },
      });

      for (const child of children) {
        await collectSubIds(child.id);
      }
    };

    await collectSubIds(departmentId);
    return ids;
  }


}
