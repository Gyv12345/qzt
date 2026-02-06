import { SetMetadata } from "@nestjs/common";

export const REQUIRES_TWO_FACTOR_KEY = "requiresTwoFactor";

/**
 * 标记需要 2FA 验证的敏感操作
 */
export const RequiresTwoFactor = () =>
  SetMetadata(REQUIRES_TWO_FACTOR_KEY, true);
