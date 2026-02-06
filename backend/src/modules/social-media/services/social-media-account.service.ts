import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/common/prisma/prisma.service";
import { CryptoUtil } from "@/lib/crypto.util";
import { ISocialMediaAccountService } from "../interfaces/social-media-account.interface";
import {
  CreateSocialMediaAccountDto,
  UpdateSocialMediaAccountDto,
  QuerySocialMediaAccountDto,
} from "../dto/social-media-account.dto";
import { SocialMediaAccount } from "@prisma/client";

@Injectable()
export class SocialMediaAccountService implements ISocialMediaAccountService {
  private readonly logger = new Logger(SocialMediaAccountService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建新媒体账号
   */
  async create(data: CreateSocialMediaAccountDto): Promise<SocialMediaAccount> {
    try {
      // 加密敏感信息
      const encryptedData = {
        ...data,
        appSecret: data.appSecret ? CryptoUtil.encrypt(data.appSecret) : null,
        accessToken: data.accessToken
          ? CryptoUtil.encrypt(data.accessToken)
          : null,
        refreshToken: data.refreshToken
          ? CryptoUtil.encrypt(data.refreshToken)
          : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      };

      const account = await this.prisma.socialMediaAccount.create({
        data: encryptedData,
      });

      this.logger.log(`创建新媒体账号成功: ${account.id}`);
      return account;
    } catch (error) {
      this.logger.error(`创建新媒体账号失败: ${error.message}`);
      throw new BadRequestException(`创建账号失败: ${error.message}`);
    }
  }

  /**
   * 更新媒体账号
   */
  async update(
    id: string,
    data: UpdateSocialMediaAccountDto,
  ): Promise<SocialMediaAccount> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`账号不存在: ${id}`);
    }

    try {
      const updateData: any = { ...data };

      // 如果提供了敏感信息，需要加密
      if (data.appSecret) {
        updateData.appSecret = CryptoUtil.encrypt(data.appSecret);
      }
      if (data.accessToken) {
        updateData.accessToken = CryptoUtil.encrypt(data.accessToken);
      }
      if (data.refreshToken) {
        updateData.refreshToken = CryptoUtil.encrypt(data.refreshToken);
      }
      if (data.expiresAt) {
        updateData.expiresAt = new Date(data.expiresAt);
      }

      const account = await this.prisma.socialMediaAccount.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`更新新媒体账号成功: ${id}`);
      return account;
    } catch (error) {
      this.logger.error(`更新新媒体账号失败: ${error.message}`);
      throw new BadRequestException(`更新账号失败: ${error.message}`);
    }
  }

  /**
   * 删除账号
   */
  async delete(id: string): Promise<SocialMediaAccount> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`账号不存在: ${id}`);
    }

    try {
      const account = await this.prisma.socialMediaAccount.delete({
        where: { id },
      });

      this.logger.log(`删除新媒体账号成功: ${id}`);
      return account;
    } catch (error) {
      this.logger.error(`删除新媒体账号失败: ${error.message}`);
      throw new BadRequestException(`删除账号失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找账号
   */
  async findById(id: string): Promise<SocialMediaAccount | null> {
    try {
      const account = await this.prisma.socialMediaAccount.findUnique({
        where: { id },
        include: {
          posts: true,
        },
      });
      return account;
    } catch (error) {
      this.logger.error(`查找账号失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 查询账号列表
   */
  async findAll(
    query: QuerySocialMediaAccountDto,
  ): Promise<{ data: SocialMediaAccount[]; total: number }> {
    const { platform, status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (platform) {
      where.platform = platform;
    }
    if (status !== undefined) {
      where.status = status;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.socialMediaAccount.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.socialMediaAccount.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(`查询账号列表失败: ${error.message}`);
      throw new BadRequestException(`查询失败: ${error.message}`);
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(
    id: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const account = await this.findById(id);
    if (!account) {
      throw new NotFoundException(`账号不存在: ${id}`);
    }

    if (!account.refreshToken) {
      throw new BadRequestException("该账号没有配置刷新令牌");
    }

    try {
      // 解密刷新令牌
      const decryptedRefreshToken = CryptoUtil.decrypt(account.refreshToken);

      // 这里应该调用各个平台的刷新令牌接口
      // TODO: 实现具体的平台令牌刷新逻辑

      // 模拟刷新成功
      const newAccessToken = "new_access_token";
      const expiresAt = new Date(Date.now() + 7200 * 1000); // 2小时后过期

      const updated = await this.update(id, {
        accessToken: newAccessToken,
      });

      this.logger.log(`刷新访问令牌成功: ${id}`);
      return {
        accessToken: newAccessToken,
        expiresAt: expiresAt,
      };
    } catch (error) {
      this.logger.error(`刷新访问令牌失败: ${error.message}`);
      throw new BadRequestException(`刷新令牌失败: ${error.message}`);
    }
  }

  /**
   * 解密敏感信息
   */
  async decryptSensitiveInfo(
    account: SocialMediaAccount,
  ): Promise<SocialMediaAccount> {
    const decrypted = { ...account };

    if (account.appSecret) {
      try {
        decrypted.appSecret = CryptoUtil.decrypt(account.appSecret);
      } catch (error) {
        this.logger.warn(`解密 appSecret 失败: ${error.message}`);
      }
    }

    if (account.accessToken) {
      try {
        decrypted.accessToken = CryptoUtil.decrypt(account.accessToken);
      } catch (error) {
        this.logger.warn(`解密 accessToken 失败: ${error.message}`);
      }
    }

    if (account.refreshToken) {
      try {
        decrypted.refreshToken = CryptoUtil.decrypt(account.refreshToken);
      } catch (error) {
        this.logger.warn(`解密 refreshToken 失败: ${error.message}`);
      }
    }

    return decrypted;
  }

  /**
   * 验证账号有效性
   */
  async validateAccount(id: string): Promise<boolean> {
    const account = await this.findById(id);
    if (!account) {
      return false;
    }

    // 检查令牌是否过期
    if (account.expiresAt && new Date() > account.expiresAt) {
      return false;
    }

    // 检查状态
    if (account.status !== 1) {
      return false;
    }

    return true;
  }
}
