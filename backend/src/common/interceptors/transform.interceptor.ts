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

        // 包装为标准格式
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
