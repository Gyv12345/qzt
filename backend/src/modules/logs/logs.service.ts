import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueryOperationLogDto } from "./dto/query-operation-log.dto";
import { QuerySystemLogDto } from "./dto/query-system-log.dto";
import { ExportLogDto } from "./dto/export-log.dto";

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询操作日志
   */
  async findOperationLogs(query: QueryOperationLogDto) {
    const {
      page = 1,
      pageSize = 10,
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.OperationLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    // 查询总数
    const total = await this.prisma.operationLog.count({ where });

    // 查询数据
    const data = await this.prisma.operationLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 分页查询系统日志
   */
  async findSystemLogs(query: QuerySystemLogDto) {
    const {
      page = 1,
      pageSize = 10,
      level,
      module,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.SystemLogWhereInput = {};

    if (level) {
      where.level = level;
    }

    if (module) {
      where.module = { contains: module };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    // 查询总数
    const total = await this.prisma.systemLog.count({ where });

    // 查询数据
    const data = await this.prisma.systemLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取日志详情
   */
  async findOne(type: "operation" | "system", id: string) {
    if (type === "operation") {
      return this.prisma.operationLog.findUnique({
        where: { id },
      });
    } else {
      return this.prisma.systemLog.findUnique({
        where: { id },
      });
    }
  }

  /**
   * 导出日志为 CSV
   */
  async exportToCsv(exportLogDto: ExportLogDto) {
    const { type, startDate, endDate } = exportLogDto;

    // 构建时间条件
    const timeCondition: any = {};
    if (startDate || endDate) {
      timeCondition.createdAt = {};
      if (startDate) {
        timeCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        timeCondition.createdAt.lte = endDateTime;
      }
    }

    if (type === "operation") {
      const logs = await this.prisma.operationLog.findMany({
        where: timeCondition,
        orderBy: { createdAt: "desc" },
        take: 10000, // 限制导出数量
      });

      // 生成 CSV
      const headers = [
        "ID",
        "用户ID",
        "用户名",
        "操作类型",
        "资源类型",
        "资源ID",
        "IP地址",
        "UserAgent",
        "详情",
        "创建时间",
      ];
      const rows = logs.map((log) => [
        log.id,
        log.userId,
        log.username,
        log.action,
        log.resource,
        log.resourceId || "",
        log.ip || "",
        log.userAgent || "",
        log.detail || "",
        log.createdAt.toISOString(),
      ]);

      return this.generateCsv(headers, rows);
    } else {
      const logs = await this.prisma.systemLog.findMany({
        where: timeCondition,
        orderBy: { createdAt: "desc" },
        take: 10000,
      });

      const headers = [
        "ID",
        "级别",
        "模块",
        "消息",
        "堆栈信息",
        "详情",
        "创建时间",
      ];
      const rows = logs.map((log) => [
        log.id,
        log.level,
        log.module,
        log.message,
        log.stacktrace || "",
        log.detail || "",
        log.createdAt.toISOString(),
      ]);

      return this.generateCsv(headers, rows);
    }
  }

  /**
   * 生成 CSV 内容
   */
  private generateCsv(headers: string[], rows: string[][]): string {
    const csvRows = [headers, ...rows];
    return csvRows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
  }

  /**
   * 创建操作日志（供其他服务调用）
   */
  async createOperationLog(data: {
    userId: string;
    username: string;
    action: string;
    resource: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    detail?: string;
  }) {
    return this.prisma.operationLog.create({
      data,
    });
  }

  /**
   * 创建系统日志（供其他服务调用）
   */
  async createSystemLog(data: {
    level: string;
    module: string;
    message: string;
    stacktrace?: string;
    detail?: string;
  }) {
    return this.prisma.systemLog.create({
      data,
    });
  }
}
