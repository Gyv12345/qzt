import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { DataScope } from "../guards/data-scope.guard";

interface DataScopeInfo {
  type: string;
  userIds?: string[];
  departmentIds?: string[];
}

/**
 * 数据权限工具类
 * 用于构建带数据权限过滤的Prisma查询条件
 */
@Injectable()
export class DataScopeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据数据范围构建客户查询的where条件
   */
  async buildCustomerWhere(
    dataScope: DataScopeInfo,
    additionalWhere?: any,
  ): Promise<any> {
    const where: any = { ...additionalWhere };

    switch (dataScope.type) {
      case DataScope.ALL:
        // 查看全部，不需要额外条件
        break;

      case DataScope.DEPARTMENT:
      case DataScope.DEPARTMENT_AND_SUB:
        // 根据部门过滤 - 通过客户的跟进人所在部门
        if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
          const userIds = await this.getUserIdsByDepartments(
            dataScope.departmentIds,
          );
          where.followUserId = { in: userIds };
        }
        break;

      case DataScope.SELF:
      default:
        // 只看自己的数据
        if (dataScope.userIds && dataScope.userIds.length > 0) {
          where.followUserId = { in: dataScope.userIds };
        }
        break;
    }

    return where;
  }

  /**
   * 根据数据范围构建合同查询的where条件
   */
  async buildContractWhere(
    dataScope: DataScopeInfo,
    additionalWhere?: any,
  ): Promise<any> {
    const where: any = { ...additionalWhere };

    switch (dataScope.type) {
      case DataScope.ALL:
        break;

      case DataScope.DEPARTMENT:
      case DataScope.DEPARTMENT_AND_SUB:
        // 根据部门过滤 - 通过客户间接过滤
        if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
          const userIds = await this.getUserIdsByDepartments(
            dataScope.departmentIds,
          );
          where.customer = {
            followUserId: { in: userIds },
          };
        }
        break;

      case DataScope.SELF:
      default:
        if (dataScope.userIds && dataScope.userIds.length > 0) {
          where.customer = {
            followUserId: { in: dataScope.userIds },
          };
        }
        break;
    }

    return where;
  }

  /**
   * 根据数据范围构建联系人查询的where条件
   */
  async buildContactWhere(
    dataScope: DataScopeInfo,
    additionalWhere?: any,
  ): Promise<any> {
    const where: any = { ...additionalWhere };

    switch (dataScope.type) {
      case DataScope.ALL:
        break;

      case DataScope.DEPARTMENT:
      case DataScope.DEPARTMENT_AND_SUB:
        if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
          const userIds = await this.getUserIdsByDepartments(
            dataScope.departmentIds,
          );
          where.ownerUserId = { in: userIds };
        }
        break;

      case DataScope.SELF:
      default:
        if (dataScope.userIds && dataScope.userIds.length > 0) {
          where.ownerUserId = { in: dataScope.userIds };
        }
        break;
    }

    return where;
  }

  /**
   * 根据部门ID获取所有用户ID
   */
  private async getUserIdsByDepartments(
    departmentIds: string[],
  ): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        departmentId: { in: departmentIds },
        status: "ACTIVE", // 只获取启用的用户
      },
      select: { id: true },
    });

    return users.map((u) => u.id);
  }

  /**
   * 检查用户是否有权访问指定资源
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param dataScope 数据范围信息
   */
  async canAccess(
    resourceType: string,
    resourceId: string,
    dataScope: DataScopeInfo,
  ): Promise<boolean> {
    switch (resourceType) {
      case "customer":
        return this.canAccessCustomer(resourceId, dataScope);

      case "contract":
        return this.canAccessContract(resourceId, dataScope);

      case "contact":
        return this.canAccessContact(resourceId, dataScope);

      default:
        // 默认允许访问
        return true;
    }
  }

  /**
   * 检查是否有权访问客户
   */
  private async canAccessCustomer(
    customerId: string,
    dataScope: DataScopeInfo,
  ): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { followUserId: true },
    });

    if (!customer) {
      return false;
    }

    switch (dataScope.type) {
      case DataScope.ALL:
        return true;

      case DataScope.SELF:
        return (
          dataScope.userIds?.includes(customer.followUserId || "") || false
        );

      case DataScope.DEPARTMENT:
      case DataScope.DEPARTMENT_AND_SUB:
        if (!dataScope.departmentIds || dataScope.departmentIds.length === 0) {
          return false;
        }
        const allowedUserIds = await this.getUserIdsByDepartments(
          dataScope.departmentIds,
        );
        return allowedUserIds.includes(customer.followUserId || "");

      default:
        return true;
    }
  }

  /**
   * 检查是否有权访问合同
   */
  private async canAccessContract(
    contractId: string,
    dataScope: DataScopeInfo,
  ): Promise<boolean> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { customer: { select: { followUserId: true } } },
    });

    if (!contract || !contract.customer) {
      return false;
    }

    const followUserId = contract.customer.followUserId;

    switch (dataScope.type) {
      case DataScope.ALL:
        return true;

      case DataScope.SELF:
        return dataScope.userIds?.includes(followUserId || "") || false;

      case DataScope.DEPARTMENT:
      case DataScope.DEPARTMENT_AND_SUB:
        if (!dataScope.departmentIds || dataScope.departmentIds.length === 0) {
          return false;
        }
        const allowedUserIds = await this.getUserIdsByDepartments(
          dataScope.departmentIds,
        );
        return allowedUserIds.includes(followUserId || "");

      default:
        return true;
    }
  }

  /**
   * 检查是否有权访问联系人
   */
  private async canAccessContact(
    contactId: string,
    dataScope: DataScopeInfo,
  ): Promise<boolean> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { ownerUserId: true },
    });

    if (!contact) {
      return false;
    }

    switch (dataScope.type) {
      case DataScope.ALL:
        return true;

      case DataScope.SELF:
        return dataScope.userIds?.includes(contact.ownerUserId || "") || false;

      case DataScope.DEPARTMENT:
      case DataScope.DEPARTMENT_AND_SUB:
        if (!dataScope.departmentIds || dataScope.departmentIds.length === 0) {
          return false;
        }
        const allowedUserIds = await this.getUserIdsByDepartments(
          dataScope.departmentIds,
        );
        return allowedUserIds.includes(contact.ownerUserId || "");

      default:
        return true;
    }
  }
}
