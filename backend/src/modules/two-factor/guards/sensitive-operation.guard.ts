import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TwoFactorService } from "../two-factor.service";
import { REQUIRES_TWO_FACTOR_KEY } from "../decorators/requires-two-factor.decorator";

/**
 * 敏感操作守卫
 * 检查用户是否启用了 2FA，如果启用则要求提供有效的 TOTP 验证码
 */
@Injectable()
export class SensitiveOperationGuard implements CanActivate {
  constructor(
    private twoFactorService: TwoFactorService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查端点是否需要 2FA 验证
    const requiresTwoFactor = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_TWO_FACTOR_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果端点不需要 2FA，直接通过
    if (!requiresTwoFactor) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const twoFactorToken = request.headers["x-two-factor-token"];

    if (!user?.userId) {
      throw new UnauthorizedException("用户未认证");
    }

    // 检查用户是否启用 2FA
    const status = await this.twoFactorService.getStatus(user.userId);
    if (!status.enabled) {
      // 未启用 2FA，直接通过
      return true;
    }

    // 验证 TOTP 代码
    if (!twoFactorToken) {
      throw new UnauthorizedException("需要双因素认证验证码");
    }

    const isValid = await this.twoFactorService.verifyOperationToken(
      user.userId,
      twoFactorToken as string,
    );

    if (!isValid) {
      throw new UnauthorizedException("双因素认证验证码无效");
    }

    return true;
  }
}
