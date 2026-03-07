import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../prisma/prisma.service";

declare module "express" {
  interface Request {
    user?: {
      userId: string;
      username: string;
      isAdmin: boolean;
      permissions?: string[];
    };
  }
}

interface OperationLogData {
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  detail?: any;
}

@Injectable()
export class OperationLogMiddleware implements NestMiddleware {
  private prisma: PrismaService;

  constructor() {
    // 延迟初始化 PrismaService 避免循环依赖
    setTimeout(() => {
      this.prisma = new PrismaService();
    }, 0);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // 只记录需要审计的操作
    const method = req.method;
    const path = req.path;

    // 跳过不需要记录的路径
    if (this.shouldSkip(path)) {
      return next();
    }

    // 记录原始的 res.json 方法
    const originalJson = res.json.bind(res);

    // 重写 res.json 方法以捕获响应
    const self = this;
    res.json = function (data: any) {
      // 异步记录操作日志
      setImmediate(() => {
        self.logOperation(req, res, data).catch((err) => {
          console.error("Failed to log operation:", err);
        });
      });

      return originalJson(data);
    };

    next();
  }

  private shouldSkip(path: string): boolean {
    const skipPaths = [
      "/health",
      "/api-docs",
      "/api-docs-json",
      "/auth/login",
      "/auth/register",
    ];

    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }

  private async logOperation(
    req: Request,
    res: Response,
    responseData: any,
  ): Promise<void> {
    try {
      if (!this.prisma) {
        return;
      }

      const user = req.user;
      if (!user) {
        return;
      }

      const method = req.method;
      const path = req.path;

      // 确定操作类型和资源
      const { action, resource } = this.parseAction(method, path);

      // 提取资源ID
      const resourceId = this.extractResourceId(path);

      // 构建日志数据
      const logData: OperationLogData = {
        userId: user.userId,
        username: user.username,
        action,
        resource,
        resourceId,
        ip: req.ip || req.connection.remoteAddress || "unknown",
        userAgent: req.get("user-agent") || "",
        detail: {
          method,
          path,
          statusCode: res.statusCode,
          success: responseData?.success !== false,
        },
      };

      // 异步写入数据库
      await this.prisma.operationLog.create({
        data: {
          userId: logData.userId,
          username: logData.username,
          action: logData.action,
          resource: logData.resource,
          resourceId: logData.resourceId,
          ip: logData.ip,
          userAgent: logData.userAgent,
          detail: JSON.stringify(logData.detail),
        },
      });
    } catch (error) {
      // 记录日志失败不影响业务
      console.error("Failed to log operation:", error);
    }
  }

  private parseAction(
    method: string,
    path: string,
  ): { action: string; resource: string } {
    // 从路径提取资源名称
    const pathParts = path.split("/").filter(Boolean);
    const resource = pathParts[0] || "unknown";

    // 根据HTTP方法确定操作类型
    const actionMap: Record<string, string> = {
      GET: "VIEW",
      POST: "CREATE",
      PUT: "UPDATE",
      PATCH: "UPDATE",
      DELETE: "DELETE",
    };

    const action = actionMap[method] || "UNKNOWN";

    return { action, resource };
  }

  private extractResourceId(path: string): string | undefined {
    // 从路径中提取资源ID (例如: /users/123 -> 123)
    const matches = path.match(/\/([a-f0-9]{24}|[0-9]+)/);
    return matches ? matches[1] : undefined;
  }
}
