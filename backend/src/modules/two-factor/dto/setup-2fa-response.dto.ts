import { ApiProperty } from "@nestjs/swagger";

/**
 * 2FA 设置响应 DTO
 */
export class Setup2faResponseDto {
  @ApiProperty({ description: "TOTP 密钥（用于手动输入）" })
  secret: string;

  @ApiProperty({ description: "二维码 URL（用于扫描）" })
  qrCodeUrl: string;

  @ApiProperty({ description: "应用名称" })
  appName: string;

  @ApiProperty({ description: "用户账户名" })
  accountName: string;
}

/**
 * 2FA 状态响应 DTO
 */
export class TwoFactorStatusDto {
  @ApiProperty({ description: "是否启用 2FA" })
  enabled: boolean;

  @ApiProperty({ description: "是否已完成首次登录设置", required: false })
  hasCompletedFirstLogin?: boolean;

  @ApiProperty({ description: "2FA 设置完成时间", required: false })
  setupCompletedAt?: Date;
}

/**
 * 备份码响应 DTO
 */
export class BackupCodesDto {
  @ApiProperty({ description: "备份码列表", type: [String] })
  backupCodes: string[];

  @ApiProperty({ description: "警告：这些备份码只会显示一次，请妥善保存" })
  warning: string;
}

/**
 * 验证 TOTP 响应 DTO
 */
export class VerifyTotpResponseDto {
  @ApiProperty({ description: "验证是否成功" })
  valid: boolean;

  @ApiProperty({ description: "是否为备份码", required: false })
  isBackupCode?: boolean;
}
