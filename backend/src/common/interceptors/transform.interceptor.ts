import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id || 'N/A';

    return next.handle().pipe(
      map((data) => {
        // 如果已经是标准格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            requestId,
            timestamp: new Date().toISOString(),
          };
        }

        // 检查是否是分页响应（包含 data, total, page 等字段）
        const isPaginatedResponse =
          data &&
          typeof data === 'object' &&
          'data' in data &&
          ('total' in data || 'page' in data || 'pageSize' in data || 'totalPages' in data);

        // 分页响应不提取 data 字段，保留完整结构
        if (isPaginatedResponse) {
          return {
            success: true,
            statusCode: context.switchToHttp().getResponse().statusCode,
            message: data?.message || '操作成功',
            data: data,
            timestamp: new Date().toISOString(),
            requestId,
          };
        }

        // 普通响应：如果包含 data 字段则提取
        return {
          success: true,
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: data?.message || '操作成功',
          data: data?.data !== undefined ? data.data : data,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}
