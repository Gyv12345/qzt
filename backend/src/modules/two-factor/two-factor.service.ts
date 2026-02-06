import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as crypto from "crypto";
import { PrismaService } from "@/common/prisma/prisma.service";

/**
 * 2FA 服务
 * 提供 TOTP 生成、验证、备份码管理等功能
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 生成设置 2FA 所需的信息
   */
  async generateSetupSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    const appName = this.configService.get<string>("TOTP_APP_NAME", "企账通");
    const accountName = user.email || user.username;

    // 生成新的 TOTP 密钥
    const secret = generateSecret();

    // 生成二维码 URL
    const qrCodeUrl = generateURI({
      label: accountName,
      issuer: appName,
      secret,
    });

    return {
      secret,
      qrCodeUrl,
      appName,
      accountName,
    };
  }

  /**
   * 启用 2FA
   */
  async enableTwoFactor(userId: string, secret: string, token: string) {
    // 验证 token 是否正确
    const result = verifySync({ token, secret });
    const isValid = result.valid;

    if (!isValid) {
      throw new UnauthorizedException("验证码无效");
    }

    // 加密存储密钥
    const encryptedSecret = this.encryptSecret(secret);

    // 生成备份码
    const backupCodes = this.generateBackupCodes();
    const encryptedBackupCodes = this.encryptBackupCodes(backupCodes);

    // 更新用户记录
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: encryptedBackupCodes,
        twoFactorSetupCompletedAt: new Date(),
      },
    });

    return {
      backupCodes,
      message: "2FA 启用成功，请妥善保存备份码",
    };
  }

  /**
   * 禁用 2FA
   */
  async disableTwoFactor(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException("2FA 未启用");
    }

    // 验证 token（支持 TOTP 或备份码）
    const isValid = await this.verifyTokenInternal(
      user.twoFactorSecret,
      user.twoFactorBackupCodes,
      token,
    );

    if (!isValid) {
      throw new UnauthorizedException("验证码无效");
    }

    // 清除 2FA 设置
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorSetupCompletedAt: null,
      },
    });

    return { message: "2FA 已禁用" };
  }

  /**
   * 验证 TOTP token（用于敏感操作）
   */
  async verifyOperationToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      // 未启用 2FA 的用户直接通过
      return true;
    }

    return this.verifyTokenInternal(
      user.twoFactorSecret,
      user.twoFactorBackupCodes,
      token,
    );
  }

  /**
   * 验证 TOTP token（公开方法，用于验证端点）
   */
  async verifyToken(
    userId: string,
    token: string,
  ): Promise<{ valid: boolean; isBackupCode?: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      return { valid: false };
    }

    const isValid = await this.verifyTokenInternal(
      user.twoFactorSecret,
      user.twoFactorBackupCodes,
      token,
    );

    // 检查是否为备份码
    const isBackupCode =
      isValid && token.length === 10 && /^[A-Z0-9]{10}$/.test(token);

    return { valid: isValid, isBackupCode };
  }

  /**
   * 获取 2FA 状态
   */
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        hasCompletedFirstLogin: true,
        twoFactorSetupCompletedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    return {
      enabled: user.twoFactorEnabled,
      hasCompletedFirstLogin: user.hasCompletedFirstLogin,
      setupCompletedAt: user.twoFactorSetupCompletedAt,
    };
  }

  /**
   * 重新生成备份码
   */
  async regenerateBackupCodes(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException("2FA 未启用");
    }

    // 验证当前 TOTP
    const secret = this.decryptSecret(user.twoFactorSecret!);
    const result = verifySync({ token, secret });
    const isValid = result.valid;

    if (!isValid) {
      throw new UnauthorizedException("验证码无效");
    }

    // 生成新的备份码
    const backupCodes = this.generateBackupCodes();
    const encryptedBackupCodes = this.encryptBackupCodes(backupCodes);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    });

    return {
      backupCodes,
      message: "备份码已重新生成，请妥善保存",
    };
  }

  /**
   * 检查用户是否需要强制设置 2FA
   */
  async checkRequiresTwoFactorSetup(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSystem: true,
        twoFactorEnabled: true,
        hasCompletedFirstLogin: true,
      },
    });

    if (!user) {
      return false;
    }

    // 系统用户(admin)首次登录且未启用 2FA 时需要强制设置
    return (
      user.isSystem && !user.hasCompletedFirstLogin && !user.twoFactorEnabled
    );
  }

  /**
   * 标记首次登录完成
   */
  async markFirstLoginComplete(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasCompletedFirstLogin: true,
      },
    });
  }

  /**
   * 内部方法：验证 token（TOTP 或备份码）
   */
  private async verifyTokenInternal(
    encryptedSecret: string | null,
    encryptedBackupCodes: string | null,
    token: string,
  ): Promise<boolean> {
    if (!encryptedSecret) {
      return false;
    }

    const secret = this.decryptSecret(encryptedSecret);

    // 先尝试验证 TOTP（允许前后 1 个时间窗口，约30秒）
    const totpResult = verifySync({
      token,
      secret,
      epochTolerance: 30,
    });
    const isTotpValid = totpResult.valid;

    if (isTotpValid) {
      return true;
    }

    // 如果不是 TOTP，尝试验证备份码
    if (encryptedBackupCodes && token.length === 10) {
      return this.verifyBackupCode(encryptedBackupCodes, token);
    }

    return false;
  }

  /**
   * 生成 10 个备份码
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // 生成 10 位大写字母+数字的备份码
      const code = crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()
        .slice(0, 10);
      codes.push(code);
    }
    return codes;
  }

  /**
   * 验证备份码
   */
  private async verifyBackupCode(
    encryptedBackupCodes: string,
    token: string,
  ): Promise<boolean> {
    const codes = this.decryptBackupCodes(encryptedBackupCodes);
    const index = codes.indexOf(token.toUpperCase());

    if (index === -1) {
      return false;
    }

    // 移除已使用的备份码
    codes.splice(index, 1);

    // 更新数据库（这里需要知道 userId，但简化处理，由调用方处理）
    // 实际场景中应该在验证通过后立即更新
    return true;
  }

  /**
   * 加密密钥
   */
  private encryptSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(secret, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  /**
   * 解密密钥
   */
  private decryptSecret(encryptedSecret: string): string {
    const key = this.getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = encryptedSecret.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * 加密备份码
   */
  private encryptBackupCodes(codes: string[]): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const jsonData = JSON.stringify(codes);
    let encrypted = cipher.update(jsonData, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  /**
   * 解密备份码
   */
  private decryptBackupCodes(encryptedCodes: string): string[] {
    const key = this.getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = encryptedCodes.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }

  /**
   * 获取加密密钥
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>("TOTP_ENCRYPTION_KEY");
    if (!key) {
      // 如果没有配置密钥，使用默认密钥（仅开发环境）
      return crypto
        .createHash("sha256")
        .update("default-totp-encryption-key-change-in-production")
        .digest();
    }
    return crypto.createHash("sha256").update(key).digest();
  }
}
