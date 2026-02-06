import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from "@nestjs/common";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly defaultTimeout = 30000; // 30秒默认超时

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const timeoutValue = request.timeout || this.defaultTimeout;

    return next.handle().pipe(
      timeout(timeoutValue),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException("请求超时，请稍后重试"),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
