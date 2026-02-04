import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ISocialMediaPostService } from '../interfaces/social-media-post.interface';
import { IPlatformPublisher } from '../interfaces/platform-publisher.interface';
import {
  CreateSocialMediaPostDto,
  UpdateSocialMediaPostDto,
  QuerySocialMediaPostDto,
} from '../dto/social-media-post.dto';
import { SocialMediaPost, SocialMediaAccount, OssFile } from '@prisma/client';
import { PlatformPublisherFactory } from './platform-publishers/factory';

type SocialMediaPostWithRelations = SocialMediaPost & {
  account: SocialMediaAccount;
  videoFile: OssFile | null;
  coverFile: OssFile | null;
};

@Injectable()
export class SocialMediaPostService implements ISocialMediaPostService {
  private readonly logger = new Logger(SocialMediaPostService.name);

  constructor(
    private prisma: PrismaService,
    private publisherFactory: PlatformPublisherFactory,
  ) {}

  /**
   * 创建新媒体内容
   */
  async create(data: CreateSocialMediaPostDto): Promise<SocialMediaPostWithRelations> {
    try {
      // 验证账号是否存在
      const account = await this.prisma.socialMediaAccount.findUnique({
        where: { id: data.accountId },
      });

      if (!account) {
        throw new NotFoundException(`账号不存在: ${data.accountId}`);
      }

      const postData = {
        ...data,
        topics: data.topics ? JSON.stringify(data.topics) : null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        // 如果设置了定时发布，状态为 scheduled，否则为 draft
        status: data.scheduledAt ? 'scheduled' : 'draft',
      };

      const post = await this.prisma.socialMediaPost.create({
        data: postData,
        include: {
          account: true,
          videoFile: true,
          coverFile: true,
        },
      });

      this.logger.log(`创建新媒体内容成功: ${post.id}`);
      return post;
    } catch (error) {
      this.logger.error(`创建新媒体内容失败: ${error.message}`);
      throw new BadRequestException(`创建内容失败: ${error.message}`);
    }
  }

  /**
   * 更新媒体内容
   */
  async update(id: string, data: UpdateSocialMediaPostDto): Promise<SocialMediaPostWithRelations> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`内容不存在: ${id}`);
    }

    // 已发布或正在发布的内容不允许修改
    if (existing.status === 'published' || existing.status === 'publishing') {
      throw new BadRequestException('已发布或正在发布的内容不允许修改');
    }

    try {
      const updateData: any = {
        ...data,
        topics: data.topics ? JSON.stringify(data.topics) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      };

      // 如果设置了定时发布时间，更新状态为 scheduled
      if (data.scheduledAt) {
        updateData.status = 'scheduled';
      }

      const post = await this.prisma.socialMediaPost.update({
        where: { id },
        data: updateData,
        include: {
          account: true,
          videoFile: true,
          coverFile: true,
        },
      });

      this.logger.log(`更新新媒体内容成功: ${id}`);
      return post;
    } catch (error) {
      this.logger.error(`更新新媒体内容失败: ${error.message}`);
      throw new BadRequestException(`更新内容失败: ${error.message}`);
    }
  }

  /**
   * 删除内容
   */
  async delete(id: string): Promise<SocialMediaPostWithRelations> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`内容不存在: ${id}`);
    }

    // 正在发布的内容不允许删除
    if (existing.status === 'publishing') {
      throw new BadRequestException('正在发布的内容不允许删除');
    }

    try {
      // 先获取包含关联数据的记录
      const postWithRelations = await this.findById(id);

      await this.prisma.socialMediaPost.delete({
        where: { id },
      });

      this.logger.log(`删除新媒体内容成功: ${id}`);
      return postWithRelations!;
    } catch (error) {
      this.logger.error(`删除新媒体内容失败: ${error.message}`);
      throw new BadRequestException(`删除内容失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找内容
   */
  async findById(id: string): Promise<SocialMediaPostWithRelations | null> {
    try {
      const post = await this.prisma.socialMediaPost.findUnique({
        where: { id },
        include: {
          account: true,
          videoFile: true,
          coverFile: true,
        },
      });
      return post;
    } catch (error) {
      this.logger.error(`查找内容失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 查询内容列表
   */
  async findAll(query: QuerySocialMediaPostDto): Promise<{ data: SocialMediaPostWithRelations[]; total: number }> {
    const { accountId, status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (accountId) {
      where.accountId = accountId;
    }
    if (status) {
      where.status = status;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.socialMediaPost.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            account: true,
            videoFile: true,
            coverFile: true,
          },
        }),
        this.prisma.socialMediaPost.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(`查询内容列表失败: ${error.message}`);
      throw new BadRequestException(`查询失败: ${error.message}`);
    }
  }

  /**
   * 发布内容
   */
  async publish(id: string): Promise<SocialMediaPostWithRelations> {
    const post = await this.findById(id);
    if (!post) {
      throw new NotFoundException(`内容不存在: ${id}`);
    }

    if (post.status === 'published') {
      throw new BadRequestException('内容已发布');
    }

    if (post.status === 'publishing') {
      throw new BadRequestException('内容正在发布中');
    }

    try {
      // 更新状态为发布中
      await this.prisma.socialMediaPost.update({
        where: { id },
        data: { status: 'publishing' },
      });

      // 获取对应的发布器
      const publisher = this.publisherFactory.getPublisher(post.account.platform);

      // 准备发布数据
      const publishData = {
        title: post.title,
        description: post.content || undefined,
        videoUrl: post.videoUrl || post.videoFile?.fileUrl || '',
        coverUrl: post.coverUrl || post.coverFile?.fileUrl || undefined,
        topics: post.topics ? JSON.parse(post.topics) : undefined,
        location: post.location || undefined,
        visibility: post.visibility,
        account: post.account,
      };

      // 执行发布
      const result = await publisher.publishVideo(publishData);

      if (result.success) {
        // 发布成功
        const updated = await this.prisma.socialMediaPost.update({
          where: { id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            publishData: JSON.stringify({
              postId: result.postId,
              postUrl: result.postUrl,
            }),
          },
          include: {
            account: true,
            videoFile: true,
            coverFile: true,
          },
        });

        this.logger.log(`发布内容成功: ${id}, 平台内容ID: ${result.postId}`);
        return updated;
      } else {
        // 发布失败
        const updated = await this.prisma.socialMediaPost.update({
          where: { id },
          data: {
            status: 'failed',
            error: result.error,
          },
          include: {
            account: true,
            videoFile: true,
            coverFile: true,
          },
        });

        this.logger.error(`发布内容失败: ${id}, 错误: ${result.error}`);
        return updated;
      }
    } catch (error) {
      this.logger.error(`发布内容失败: ${error.message}`);

      // 更新状态为失败
      await this.prisma.socialMediaPost.update({
        where: { id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      throw new BadRequestException(`发布失败: ${error.message}`);
    }
  }

  /**
   * 定时发布
   */
  async schedulePublish(id: string, scheduledAt: Date): Promise<SocialMediaPostWithRelations> {
    const post = await this.findById(id);
    if (!post) {
      throw new NotFoundException(`内容不存在: ${id}`);
    }

    if (post.status === 'published') {
      throw new BadRequestException('内容已发布');
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('定时发布时间必须大于当前时间');
    }

    try {
      const updated = await this.prisma.socialMediaPost.update({
        where: { id },
        data: {
          status: 'scheduled',
          scheduledAt,
        },
        include: {
          account: true,
          videoFile: true,
          coverFile: true,
        },
      });

      this.logger.log(`设置定时发布成功: ${id}, 时间: ${scheduledAt.toISOString()}`);
      return updated;
    } catch (error) {
      this.logger.error(`设置定时发布失败: ${error.message}`);
      throw new BadRequestException(`设置定时发布失败: ${error.message}`);
    }
  }

  /**
   * 取消定时发布
   */
  async cancelScheduled(id: string): Promise<SocialMediaPostWithRelations> {
    const post = await this.findById(id);
    if (!post) {
      throw new NotFoundException(`内容不存在: ${id}`);
    }

    if (post.status !== 'scheduled') {
      throw new BadRequestException('只能取消定时发布状态的内容');
    }

    try {
      const updated = await this.prisma.socialMediaPost.update({
        where: { id },
        data: {
          status: 'draft',
          scheduledAt: null,
        },
        include: {
          account: true,
          videoFile: true,
          coverFile: true,
        },
      });

      this.logger.log(`取消定时发布成功: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`取消定时发布失败: ${error.message}`);
      throw new BadRequestException(`取消定时发布失败: ${error.message}`);
    }
  }

  /**
   * 批量发布
   */
  async batchPublish(ids: string[]): Promise<SocialMediaPostWithRelations[]> {
    const results: SocialMediaPostWithRelations[] = [];

    for (const id of ids) {
      try {
        const result = await this.publish(id);
        results.push(result);
      } catch (error) {
        this.logger.error(`批量发布失败: ${id}, 错误: ${error.message}`);
        // 继续处理其他内容
      }
    }

    return results;
  }

  /**
   * 查询内容的发布日志
   */
  async getPublishLogs(
    postId: string,
    query: { page?: number; pageSize?: number },
  ) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.socialMediaPublishLog.findMany({
        where: { postId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.socialMediaPublishLog.count({
        where: { postId },
      }),
    ]);

    return {
      data: logs,
      total,
    };
  }

  /**
   * 查询所有发布日志
   */
  async getAllPublishLogs(query: {
    page?: number;
    pageSize?: number;
    platform?: string;
    status?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.platform) {
      where.platform = query.platform;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.socialMediaPublishLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.socialMediaPublishLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
    };
  }
}
