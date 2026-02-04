import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly slowThreshold = 1000; // 慢查询阈值：1秒

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id || 'N/A';
    const { method, url } = request;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          // 记录性能数据
          if (duration > this.slowThreshold) {
            this.logger.warn(
              `[${requestId}] 慢查询: ${method} ${url} - 耗时: ${duration}ms`,
            );
          } else {
            this.logger.debug(
              `[${requestId}] ${method} ${url} - 耗时: ${duration}ms`,
            );
          }
        },
      }),
    );
  }
}
