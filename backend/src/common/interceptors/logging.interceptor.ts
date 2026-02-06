import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;
    const requestId = request.id || "N/A";
    const userAgent = request.get("user-agent") || "";
    const userId = request.user?.userId || "anonymous";

    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] ${method} ${url} - User: ${userId} - IP: ${ip} - ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `[${requestId}] ${method} ${url} - Status: ${statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.logger.error(
            `[${requestId}] ${method} ${url} - Status: ${statusCode} - ${duration}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
