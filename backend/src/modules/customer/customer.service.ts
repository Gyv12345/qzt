import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import * as XLSX from "xlsx";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomerDto } from "./dto/query-customer.dto";

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建客户
   */
  async create(createCustomerDto: CreateCustomerDto, userId: string) {
    // 验证跟进人是否存在
    if (createCustomerDto.followUserId) {
      const followUser = await this.prisma.user.findUnique({
        where: { id: createCustomerDto.followUserId },
      });
      if (!followUser) {
        throw new NotFoundException("跟进人不存在");
      }
    }

    // 如果没有指定跟进人,默认为当前用户
    const data = { ...createCustomerDto };
    if (!data.followUserId) {
      data.followUserId = userId;
    }

    // 创建客户数据
    const customer = await this.prisma.customer.create({
      data,
      include: {
        followRecords: true,
      },
    });

    return customer;
  }

  /**
   * 查询客户列表
   */
  async findAll(query: QueryCustomerDto, userId: string, isAdmin: boolean) {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      customerLevel,
      followUserId,
      sortField = "createdAt",
      sortOrder = "desc",
    } = query;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    // 非管理员只能看到自己负责的客户
    if (!isAdmin) {
      where.followUserId = userId;
    }

    // 关键词搜索（搜索公司名称、简称，以及关联的联系人）
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { shortName: { contains: keyword } },
        { code: { contains: keyword } },
        // 通过关联的联系人搜索
        {
          contacts: {
            some: {
              contact: {
                OR: [
                  { name: { contains: keyword } },
                  { phone: { contains: keyword } },
                ],
              },
            },
          },
        },
      ];
    }

    // 客户等级筛选
    if (customerLevel !== undefined) {
      where.customerLevel = customerLevel;
    }

    // 跟进人筛选 (管理员可以使用)
    if (followUserId && isAdmin) {
      where.followUserId = followUserId;
    }

    // 计算总数
    const total = await this.prisma.customer.count({ where });

    // 查询数据
    const data = await this.prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortField]: sortOrder,
      },
      include: {
        contacts: {
          where: { status: 1 }, // 只返回在职的联系人
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // 查询跟进人信息
    const userIds = Array.from(
      new Set(data.map((c) => c.followUserId).filter(Boolean)),
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 组装数据
    const result = data.map((customer) => {
      // 提取联系人信息
      const contacts = customer.contacts.map((cc) => ({
        id: cc.contactId,
        ...cc.contact,
        isPrimary: cc.isPrimary,
        isDecision: cc.isDecision,
      }));

      // 找出主要联系人
      const primaryContact = contacts.find((c) => c.isPrimary);

      return {
        ...customer,
        followUser: customer.followUserId
          ? userMap.get(customer.followUserId)
          : null,
        contacts,
        primaryContact,
        // 兼容旧字段，主要联系人的信息
        contactName:
          primaryContact?.name ||
          (contacts.length > 0 ? contacts[0].name : null),
        contactPhone:
          primaryContact?.phone ||
          (contacts.length > 0 ? contacts[0].phone : null),
        contactEmail:
          primaryContact?.email ||
          (contacts.length > 0 ? contacts[0].email : null),
      };
    });

    return {
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取客户详情
   */
  async findOne(id: string, userId: string, isAdmin: boolean) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: {
          include: {
            contact: true,
          },
          orderBy: [
            { status: "desc" },
            { isPrimary: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权访问此客户");
    }

    // 查询跟进人信息
    let followUser = null;
    if (customer.followUserId) {
      followUser = await this.prisma.user.findUnique({
        where: { id: customer.followUserId },
        select: {
          id: true,
          username: true,
          name: true,
        },
      });
    }

    // 组装联系人信息
    const contacts = customer.contacts.map((cc) => ({
      id: cc.contactId,
      ...cc.contact,
      isPrimary: cc.isPrimary,
      isDecision: cc.isDecision,
      department: cc.department,
      position: cc.position,
      relation: cc.relation,
      status: cc.status,
      linkedAt: cc.createdAt,
    }));

    const primaryContact = contacts.find((c) => c.isPrimary && c.status === 1);

    return {
      ...customer,
      followUser,
      contacts,
      // 兼容旧字段
      contactName:
        primaryContact?.name || (contacts.length > 0 ? contacts[0].name : null),
      contactPhone:
        primaryContact?.phone ||
        (contacts.length > 0 ? contacts[0].phone : null),
      contactEmail:
        primaryContact?.email ||
        (contacts.length > 0 ? contacts[0].email : null),
    };
  }

  /**
   * 更新客户
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    userId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权更新此客户");
    }

    // 验证跟进人是否存在
    if (updateCustomerDto.followUserId) {
      const followUser = await this.prisma.user.findUnique({
        where: { id: updateCustomerDto.followUserId },
      });
      if (!followUser) {
        throw new NotFoundException("跟进人不存在");
      }
    }

    // 更新客户
    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    return updated;
  }

  /**
   * 删除客户
   */
  async remove(id: string, userId: string, isAdmin: boolean) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证 - 只有管理员可以删除
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以删除客户");
    }

    // 删除客户
    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: "删除成功" };
  }

  /**
   * 分配单个客户
   */
  async assignOne(
    customerId: string,
    newFollowUserId: string,
    reason: string,
    operatorId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证 - 只有管理员可以分配
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以分配客户");
    }

    // 验证跟进人是否存在
    const followUser = await this.prisma.user.findUnique({
      where: { id: newFollowUserId },
    });

    if (!followUser) {
      throw new NotFoundException("跟进人不存在");
    }

    // 使用事务:更新客户并记录分配历史
    const result = await this.prisma.$transaction(async (tx) => {
      // 记录分配历史
      await tx.customerAssignmentHistory.create({
        data: {
          customerId,
          previousFollowUserId: customer.followUserId,
          newFollowUserId,
          assignedBy: operatorId,
          reason,
        },
      });

      // 更新客户
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          followUserId: newFollowUserId,
        },
      });

      return updated;
    });

    return result;
  }

  /**
   * 批量分配客户
   */
  async batchAssign(
    customerIds: string[],
    newFollowUserId: string,
    reason: string,
    operatorId: string,
    isAdmin: boolean,
  ) {
    // 权限验证 - 只有管理员可以批量分配
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以批量分配客户");
    }

    // 验证跟进人是否存在
    const followUser = await this.prisma.user.findUnique({
      where: { id: newFollowUserId },
    });

    if (!followUser) {
      throw new NotFoundException("跟进人不存在");
    }

    // 查询所有客户
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
      },
    });

    if (customers.length === 0) {
      throw new NotFoundException("未找到任何客户");
    }

    // 使用事务批量更新
    const results = await this.prisma.$transaction(
      customers.map((customer) =>
        this.prisma.customerAssignmentHistory.create({
          data: {
            customerId: customer.id,
            previousFollowUserId: customer.followUserId,
            newFollowUserId,
            assignedBy: operatorId,
            reason,
          },
        }),
      ),
    );

    // 批量更新客户
    await this.prisma.customer.updateMany({
      where: {
        id: { in: customerIds },
      },
      data: {
        followUserId: newFollowUserId,
      },
    });

    return {
      success: true,
      message: `成功分配 ${results.length} 个客户`,
      count: results.length,
    };
  }

  /**
   * 查询客户分配历史
   */
  async getAssignmentHistory(
    customerId: string,
    page: number,
    pageSize: number,
    userId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权访问此客户");
    }

    // 计算总数
    const total = await this.prisma.customerAssignmentHistory.count({
      where: { customerId },
    });

    // 查询分配历史
    const histories = await this.prisma.customerAssignmentHistory.findMany({
      where: { customerId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    // 查询用户信息
    const userIds = Array.from(
      new Set([
        ...histories.map((h) => h.previousFollowUserId).filter(Boolean),
        ...histories.map((h) => h.newFollowUserId),
        ...histories.map((h) => h.assignedBy),
      ]),
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 组装数据
    const result = histories.map((history) => ({
      ...history,
      previousFollowUser: history.previousFollowUserId
        ? userMap.get(history.previousFollowUserId)
        : null,
      newFollowUser: userMap.get(history.newFollowUserId),
      assignedByUser: userMap.get(history.assignedBy),
    }));

    return {
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 查询客户跟进记录
   */
  async getFollowRecords(
    customerId: string,
    page: number,
    pageSize: number,
    userId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权访问此客户");
    }

    // 计算总数
    const total = await this.prisma.followRecord.count({
      where: { customerId },
    });

    // 查询跟进记录
    const records = await this.prisma.followRecord.findMany({
      where: { customerId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    // 查询用户信息
    const userIds = Array.from(new Set(records.map((r) => r.userId)));

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 组装数据
    const result = records.map((record) => ({
      ...record,
      user: userMap.get(record.userId),
    }));

    return {
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 批量导入客户
   */
  async importCustomers(
    file: Express.Multer.File,
    userId: string,
    isAdmin: boolean,
  ) {
    try {
      // 读取 Excel 文件
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new BadRequestException("文件中没有数据");
      }

      // 最多导入 1000 条
      const limit = Math.min(jsonData.length, 1000);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < limit; i++) {
        const row = jsonData[i] as any;
        try {
          const customerData: CreateCustomerDto = {
            name: row["公司名称"] || row["name"],
            shortName: row["简称"] || row["shortName"] || "",
            code: row["客户编码"] || row["code"] || "",
            industry: row["行业"] || row["industry"] || "",
            scale: row["规模"] || row["scale"] || "",
            address: row["地址"] || row["address"] || "",
            website: row["网站"] || row["website"] || "",
            customerLevel: this.parseCustomerLevel(
              row["客户等级"] || row["customerLevel"] || "LEAD",
            ),
            sourceChannel: row["来源渠道"] || row["sourceChannel"] || "",
            tags: row["标签"] || row["tags"] || "",
            remark: row["备注"] || row["remark"] || "",
          };

          if (!customerData.name) {
            results.errors.push(`第 ${i + 2} 行：公司名称不能为空`);
            results.failed++;
            continue;
          }

          await this.create(customerData, userId);
          results.success++;
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : "未知错误";
          results.errors.push(`第 ${i + 2} 行：${errorMsg}`);
        }
      }

      return results;
    } catch (error) {
      throw new BadRequestException("文件格式错误，请下载模板查看正确格式");
    }
  }

  /**
   * 导出客户数据
   */
  async exportCustomers(
    query: QueryCustomerDto,
    userId: string,
    isAdmin: boolean,
  ) {
    // 获取所有符合条件的客户（不分页）
    const result = await this.findAll(
      { ...query, page: 1, pageSize: 10000 },
      userId,
      isAdmin,
    );

    const customers = result.data || [];

    // 转换为 Excel 数据
    const excelData = customers.map((customer: any) => ({
      公司名称: customer.name,
      简称: customer.shortName || "",
      客户编码: customer.code || "",
      行业: customer.industry || "",
      规模: customer.scale || "",
      地址: customer.address || "",
      网站: customer.website || "",
      客户等级: this.getCustomerLevelLabel(customer.customerLevel),
      来源渠道: customer.sourceChannel || "",
      跟进人: customer.followUser?.name || "",
      联系人: customer.contactName || "",
      联系电话: customer.contactPhone || "",
      邮箱: customer.contactEmail || "",
      标签: customer.tags || "",
      备注: customer.remark || "",
      创建时间: new Date(customer.createdAt).toLocaleDateString("zh-CN"),
    }));

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "客户数据");

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 30 }, // 公司名称
      { wch: 20 }, // 简称
      { wch: 15 }, // 客户编码
      { wch: 15 }, // 行业
      { wch: 15 }, // 规模
      { wch: 30 }, // 地址
      { wch: 25 }, // 网站
      { wch: 12 }, // 客户等级
      { wch: 15 }, // 来源渠道
      { wch: 12 }, // 跟进人
      { wch: 12 }, // 联系人
      { wch: 15 }, // 联系电话
      { wch: 25 }, // 邮箱
      { wch: 20 }, // 标签
      { wch: 30 }, // 备注
      { wch: 15 }, // 创建时间
    ];

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 生成导入模板
   */
  async generateImportTemplate() {
    const templateData = [
      {
        公司名称: "示例公司",
        简称: "示例",
        客户编码: "CUST001",
        行业: "互联网",
        规模: "51-200人",
        地址: "北京市朝阳区",
        网站: "https://example.com",
        客户等级: "LEAD",
        来源渠道: "线上推广",
        标签: "重要客户,A类",
        备注: "这是一条示例数据，请删除后填写真实数据",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "客户导入模板");

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 30 },
    ];

    // 添加说明
    const instructions = [
      ["导入说明"],
      [],
      [
        "客户等级可选值：LEAD（线索）, PROSPECT（意向）, CUSTOMER（正式）, VIP（VIP客户）",
      ],
      ["必填字段：公司名称"],
      ["最多支持导入 1000 条数据"],
      [],
      ["示例数据（请删除）："],
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "说明");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 解析客户等级
   */
  private parseCustomerLevel(
    value: string,
  ): "LEAD" | "PROSPECT" | "CUSTOMER" | "VIP" {
    const validLevels = ["LEAD", "PROSPECT", "CUSTOMER", "VIP"];
    const upperValue = String(value).toUpperCase();

    if (validLevels.includes(upperValue)) {
      return upperValue as "LEAD" | "PROSPECT" | "CUSTOMER" | "VIP";
    }

    // 中文映射
    const levelMap: Record<string, "LEAD" | "PROSPECT" | "CUSTOMER" | "VIP"> = {
      线索: "LEAD",
      意向: "PROSPECT",
      正式: "CUSTOMER",
      VIP: "VIP",
      线索公司: "LEAD",
      意向客户: "PROSPECT",
      正式客户: "CUSTOMER",
      VIP客户: "VIP",
    };

    return levelMap[value] || "LEAD";
  }

  /**
   * 获取客户等级中文名称
   */
  private getCustomerLevelLabel(level: string): string {
    const labelMap: Record<string, string> = {
      LEAD: "线索",
      PROSPECT: "意向",
      CUSTOMER: "正式",
      VIP: "VIP",
    };
    return labelMap[level] || "线索";
  }

  /**
   * 批量更新客户
   */
  async batchUpdate(
    customerIds: string[],
    updateData: any,
    userId: string,
    isAdmin: boolean,
  ) {
    // 权限验证
    if (!isAdmin) {
      // 非管理员只能更新自己负责的客户
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, followUserId: true },
      });

      const unauthorizedIds = customers
        .filter((c) => c.followUserId !== userId)
        .map((c) => c.id);

      if (unauthorizedIds.length > 0) {
        throw new ForbiddenException("无权更新部分客户");
      }
    }

    // 提取要更新的字段（排除 customerIds）
    const { customerIds: _, ...dataToUpdate } = updateData;

    // 批量更新
    const result = await this.prisma.customer.updateMany({
      where: { id: { in: customerIds } },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: `成功更新 ${result.count} 个客户`,
      count: result.count,
    };
  }

  /**
   * 批量删除客户
   */
  async batchDelete(customerIds: string[], userId: string, isAdmin: boolean) {
    // 权限验证 - 只有管理员可以批量删除
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以批量删除客户");
    }

    // 批量删除
    const result = await this.prisma.customer.deleteMany({
      where: { id: { in: customerIds } },
    });

    return {
      success: true,
      message: `成功删除 ${result.count} 个客户`,
      count: result.count,
    };
  }

  /**
   * 批量管理客户标签
   */
  async batchTags(
    customerIds: string[],
    tags: string,
    operation: "add" | "replace" | "remove",
    userId: string,
    isAdmin: boolean,
  ) {
    // 权限验证
    if (!isAdmin) {
      // 非管理员只能操作自己负责的客户
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, followUserId: true, tags: true },
      });

      const unauthorizedIds = customers
        .filter((c) => c.followUserId !== userId)
        .map((c) => c.id);

      if (unauthorizedIds.length > 0) {
        throw new ForbiddenException("无权操作部分客户");
      }
    }

    // 解析新标签
    let newTags: string[] = [];
    try {
      newTags = JSON.parse(tags);
    } catch {
      // 如果解析失败，按逗号分割
      newTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // 查询所有客户
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, tags: true },
    });

    const updates = customers.map((customer) => {
      let existingTags: string[] = [];
      try {
        existingTags = customer.tags ? JSON.parse(customer.tags) : [];
      } catch {
        existingTags = customer.tags
          ? customer.tags.split(",").map((t) => t.trim())
          : [];
      }

      let updatedTags: string[] = [];

      if (operation === "replace") {
        updatedTags = newTags;
      } else if (operation === "add") {
        updatedTags = [...new Set([...existingTags, ...newTags])];
      } else if (operation === "remove") {
        updatedTags = existingTags.filter((t) => !newTags.includes(t));
      }

      return {
        where: { id: customer.id },
        data: {
          tags: JSON.stringify(updatedTags),
        },
      };
    });

    // 批量更新
    await this.prisma.$transaction(
      updates.map((update) => this.prisma.customer.update(update)),
    );

    return {
      success: true,
      message: `成功更新 ${updates.length} 个客户的标签`,
      count: updates.length,
    };
  }

  /**
   * 客户等级分布统计
   */
  async getLevelDistribution(userId: string, isAdmin: boolean) {
    const where: Record<string, unknown> = !isAdmin
      ? { followUserId: userId }
      : {};

    // 按等级分组统计
    const levelCounts = await this.prisma.customer.groupBy({
      by: ["customerLevel"],
      where,
      _count: { id: true },
    });

    // 计算总数
    const total = await this.prisma.customer.count({ where });

    // 格式化结果
    const distribution = levelCounts.map((item) => ({
      level: item.customerLevel,
      count: item._count.id,
      percentage: total > 0 ? (item._count.id / total) * 100 : 0,
    }));

    // 确保所有等级都有数据
    const allLevels = ["LEAD", "PROSPECT", "CUSTOMER", "VIP"];
    const result = allLevels.map((level) => {
      const found = distribution.find((d) => d.level === level);
      return {
        level,
        count: found?.count || 0,
        percentage: found?.percentage || 0,
      };
    });

    return {
      total,
      distribution: result,
    };
  }

  /**
   * 客户转化率分析
   */
  async getConversionRate(months: number, userId: string, isAdmin: boolean) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const where: Record<string, unknown> = {
      createdAt: { gte: startDate },
    };
    if (!isAdmin) {
      where.followUserId = userId;
    }

    // 按月份和等级统计
    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        customerLevel: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // 按月份分组
    const monthlyData: Record<string, Record<string, number>> = {};

    for (const customer of customers) {
      const monthKey = new Date(customer.createdAt).toISOString().slice(0, 7); // YYYY-MM

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { LEAD: 0, PROSPECT: 0, CUSTOMER: 0, VIP: 0 };
      }
      monthlyData[monthKey][customer.customerLevel]++;
    }

    // 计算转化率（从 LEAD 转为其他等级的比例）
    const conversionData = Object.entries(monthlyData).map(
      ([month, levels]) => {
        const leadCount = levels.LEAD;
        const convertedCount = levels.PROSPECT + levels.CUSTOMER + levels.VIP;
        const conversionRate =
          leadCount > 0
            ? (convertedCount / (leadCount + convertedCount)) * 100
            : 0;

        return {
          month,
          lead: levels.LEAD,
          prospect: levels.PROSPECT,
          customer: levels.CUSTOMER,
          vip: levels.VIP,
          total: levels.LEAD + levels.PROSPECT + levels.CUSTOMER + levels.VIP,
          conversionRate: Math.round(conversionRate * 10) / 10,
        };
      },
    );

    return {
      data: conversionData,
      summary: {
        averageConversionRate:
          conversionData.length > 0
            ? conversionData.reduce((sum, d) => sum + d.conversionRate, 0) /
              conversionData.length
            : 0,
        totalCustomers: customers.length,
      },
    };
  }

  /**
   * 客户增长趋势
   */
  async getGrowthTrend(months: number, userId: string, isAdmin: boolean) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const where: Record<string, unknown> = {
      createdAt: { gte: startDate },
    };
    if (!isAdmin) {
      where.followUserId = userId;
    }

    // 按月份统计新增客户
    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // 按月份分组
    const monthlyCounts: Record<string, number> = {};
    const now = new Date();

    // 初始化所有月份
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      monthlyCounts[monthKey] = 0;
    }

    // 统计每月新增客户
    for (const customer of customers) {
      const monthKey = new Date(customer.createdAt).toISOString().slice(0, 7);
      if (monthlyCounts.hasOwnProperty(monthKey)) {
        monthlyCounts[monthKey]++;
      }
    }

    // 计算累计客户数
    let cumulative = 0;
    const trendData = Object.entries(monthlyCounts)
      .sort()
      .map(([month, count]) => {
        cumulative += count;
        return {
          month,
          new: count,
          cumulative,
        };
      });

    // 获取历史累计客户数（在起始日期之前的）
    const beforeDate = new Date(startDate);
    beforeDate.setDate(beforeDate.getDate() - 1);
    const historicalCount = await this.prisma.customer.count({
      where: {
        createdAt: { lt: startDate },
        ...(isAdmin ? {} : { followUserId: userId }),
      },
    });

    // 调整累计数
    trendData.forEach((d) => {
      d.cumulative += historicalCount;
    });

    return {
      data: trendData,
      summary: {
        total: cumulative + historicalCount,
        newInPeriod: customers.length,
        averagePerMonth: customers.length > 0 ? customers.length / months : 0,
      },
    };
  }
}
