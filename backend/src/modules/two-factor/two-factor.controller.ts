import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserInfo } from "../auth/interfaces/auth.interface";
import { TwoFactorService } from "./two-factor.service";
import { Enable2faDto } from "./dto/enable-2fa.dto";
import { Disable2faDto } from "./dto/disable-2fa.dto";
import { VerifyTotpDto } from "./dto/verify-totp.dto";
import {
  Setup2faResponseDto,
  TwoFactorStatusDto,
  BackupCodesDto,
  VerifyTotpResponseDto,
} from "./dto/setup-2fa-response.dto";

@ApiTags("two-factor")
@Controller("two-factor")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  @Post("setup")
  @ApiOperation({ summary: "生成 2FA 设置信息" })
  @ApiResponse({ status: 200, type: Setup2faResponseDto })
  async setup(@CurrentUser() user: UserInfo) {
    return this.twoFactorService.generateSetupSecret(user.userId);
  }

  @Post("enable")
  @ApiOperation({ summary: "启用 2FA" })
  @ApiResponse({ status: 200, type: BackupCodesDto })
  async enable(@CurrentUser() user: UserInfo, @Body() dto: Enable2faDto) {
    const result = await this.twoFactorService.enableTwoFactor(
      user.userId,
      dto.secret,
      dto.token,
    );
    return {
      backupCodes: result.backupCodes,
      warning: "这些备份码只会显示一次，请妥善保存",
    };
  }

  @Post("disable")
  @ApiOperation({ summary: "禁用 2FA" })
  @ApiResponse({ status: 200 })
  async disable(@CurrentUser() user: UserInfo, @Body() dto: Disable2faDto) {
    return this.twoFactorService.disableTwoFactor(user.userId, dto.token);
  }

  @Post("verify")
  @ApiOperation({ summary: "验证 TOTP 验证码" })
  @ApiResponse({ status: 200, type: VerifyTotpResponseDto })
  async verify(@CurrentUser() user: UserInfo, @Body() dto: VerifyTotpDto) {
    return this.twoFactorService.verifyToken(user.userId, dto.token);
  }

  @Get("status")
  @ApiOperation({ summary: "获取 2FA 状态" })
  @ApiResponse({ status: 200, type: TwoFactorStatusDto })
  async getStatus(@CurrentUser() user: UserInfo) {
    return this.twoFactorService.getStatus(user.userId);
  }

  @Post("regenerate-backup-codes")
  @ApiOperation({ summary: "重新生成备份码" })
  @ApiResponse({ status: 200, type: BackupCodesDto })
  async regenerateBackupCodes(
    @CurrentUser() user: UserInfo,
    @Body() dto: VerifyTotpDto,
  ) {
    const result = await this.twoFactorService.regenerateBackupCodes(
      user.userId,
      dto.token,
    );
    return {
      backupCodes: result.backupCodes,
      warning: "这些备份码只会显示一次，请妥善保存",
    };
  }

  @Post("verify-operation")
  @ApiOperation({ summary: "验证敏感操作的 TOTP" })
  @ApiResponse({ status: 200, type: VerifyTotpResponseDto })
  async verifyOperation(
    @CurrentUser() user: UserInfo,
    @Body() dto: VerifyTotpDto,
  ) {
    const isValid = await this.twoFactorService.verifyOperationToken(
      user.userId,
      dto.token,
    );
    return { valid: isValid };
  }
}
