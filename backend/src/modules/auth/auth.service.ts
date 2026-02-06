import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "@/common/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SafeUser } from "./interfaces/auth.interface";
import { LoginLogsService } from "../login-logs/login-logs.service";
import { TwoFactorService } from "../two-factor/two-factor.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private i18n: I18nService,
    private loginLogsService: LoginLogsService,
    private twoFactorService: TwoFactorService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async login(
    loginDto: LoginDto,
    context?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    const { ip, userAgent } = context || {};

    // 解析浏览器和操作系统信息
    const browser = this.parseBrowser(userAgent);
    const os = this.parseOS(userAgent);

    if (!user) {
      // 记录登录失败
      await this.loginLogsService.createLoginLog({
        userId: "",
        username: loginDto.username,
        ip,
        userAgent,
        browser,
        os,
        status: "FAILED",
        failReason: "INVALID_CREDENTIALS",
      });
      throw new UnauthorizedException(this.i18n.t("auth.INVALID_CREDENTIALS"));
    }

    if (user.status !== "ACTIVE") {
      // 记录登录失败
      await this.loginLogsService.createLoginLog({
        userId: user.id,
        username: user.username,
        email: user.email,
        ip,
        userAgent,
        browser,
        os,
        status: "FAILED",
        failReason: "ACCOUNT_DISABLED",
      });
      throw new UnauthorizedException(this.i18n.t("auth.ACCOUNT_DISABLED"));
    }

    // 记录登录成功
    await this.loginLogsService.createLoginLog({
      userId: user.id,
      username: user.username,
      email: user.email,
      ip,
      userAgent,
      browser,
      os,
      status: "SUCCESS",
    });

    const payload = {
      sub: user.id,
      username: user.username,
    };

    // 检查是否需要强制设置 2FA
    const requiresTwoFactorSetup =
      await this.twoFactorService.checkRequiresTwoFactorSetup(user.id);

    // 标记首次登录完成
    await this.twoFactorService.markFirstLoginComplete(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
        })),
      },
      requiresTwoFactorSetup,
    };
  }

  async getUserInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(this.i18n.t("auth.USER_NOT_FOUND"));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * 解析浏览器信息
   */
  private parseBrowser(userAgent?: string): string {
    if (!userAgent) return "Unknown";

    if (userAgent.includes("Chrome")) {
      const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      return match ? `Chrome ${match[1]}` : "Chrome";
    }
    if (userAgent.includes("Firefox")) {
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      return match ? `Firefox ${match[1]}` : "Firefox";
    }
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      const match = userAgent.match(/Version\/(\d+\.\d+\.\d+)/);
      return match ? `Safari ${match[1]}` : "Safari";
    }
    if (userAgent.includes("Edge")) {
      const match = userAgent.match(/Edge\/(\d+\.\d+\.\d+\.\d+)/);
      return match ? `Edge ${match[1]}` : "Edge";
    }

    return "Unknown";
  }

  /**
   * 解析操作系统信息
   */
  private parseOS(userAgent?: string): string {
    if (!userAgent) return "Unknown";

    if (userAgent.includes("Windows NT 10.0")) return "Windows 10";
    if (userAgent.includes("Windows NT 11.0")) return "Windows 11";
    if (userAgent.includes("Windows NT")) return "Windows";
    if (userAgent.includes("Mac OS X")) {
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      return match ? `macOS ${match[1].replace("_", ".")}` : "macOS";
    }
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) {
      const match = userAgent.match(/Android (\d+\.\d+)/);
      return match ? `Android ${match[1]}` : "Android";
    }
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      return match ? `iOS ${match[1].replace("_", ".")}` : "iOS";
    }

    return "Unknown";
  }
}
