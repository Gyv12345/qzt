import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare module 'express' {
  interface Request {
    id: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 从请求头获取请求ID，如果没有则生成新的
    const requestId = req.headers['x-request-id'] as string | undefined;

    if (requestId) {
      // 验证UUID格式（可选）
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(requestId)) {
        req.id = requestId;
      } else {
        req.id = uuidv4();
      }
    } else {
      req.id = uuidv4();
    }

    // 在响应头中返回请求ID
    res.setHeader('X-Request-ID', req.id);

    next();
  }
}
