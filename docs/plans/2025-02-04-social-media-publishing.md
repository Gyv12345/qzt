# 新媒体多平台发布集成实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现抖音、小红书、微信多平台内容自动发布，包括令牌自动刷新和定时发布

**Architecture:**
- 平台提供者模式：统一的接口，各平台独立实现
- 令牌自动刷新：检测过期自动调用OAuth刷新
- 多平台发布：批量调用各平台API，独立记录日志
- 定时发布：Scheduler定时任务触发发布
- 失败重试：支持失败后重新发布

**Tech Stack:**
- Axios for HTTP requests
- Bull Queue for async publishing
- Cron for scheduled publishing
- Crypto for token encryption

---

## Task 1: 实现令牌自动刷新

**Files:**
- Modify: `backend/src/modules/social-media/services/social-media-account.service.ts`
- Create: `backend/src/modules/social-media/providers/token-refresh.service.ts`

**Step 1: 创建令牌刷新服务**

```typescript
// backend/src/modules/social-media/providers/token-refresh.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CryptoUtil } from '@/lib/crypto.util';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * 刷新抖音令牌
   */
  async refreshDouyinToken(accountId: string): Promise<boolean> {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== 'douyin') {
      throw new Error('Account not found or not a Douyin account');
    }

    try {
      // 解密refreshToken
      const decryptedRefreshToken = CryptoUtil.decrypt(account.refreshToken!);

      // 调用抖音OAuth刷新接口
      const response = await axios.post(
        'https://developer.toutiao.com/api/apps/oauth2/renew_refresh_token/',
        {
          app_id: this.config.get('DOUYIN_APP_ID'),
          app_secret: this.config.get('DOUYIN_APP_SECRET'),
          refresh_token: decryptedRefreshToken,
        },
      );

      if (response.data.code !== 0) {
        throw new Error(`Douyin token refresh failed: ${response.data.message}`);
      }

      const { access_token, refresh_token, expires_in } = response.data.data;

      // 计算过期时间
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // 更新令牌（加密存储）
      await this.prisma.socialMediaAccount.update({
        where: { id: accountId },
        data: {
          accessToken: CryptoUtil.encrypt(access_token),
          refreshToken: CryptoUtil.encrypt(refresh_token),
          expiresAt,
        },
      });

      this.logger.log(`Douyin token refreshed: ${accountId}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh Douyin token: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 刷新小红书令牌
   */
  async refreshXiaohongshuToken(accountId: string): Promise<boolean> {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== 'xiaohongshu') {
      throw new Error('Account not found or not a Xiaohongshu account');
    }

    try {
      // 解密refreshToken
      const decryptedRefreshToken = CryptoUtil.decrypt(account.refreshToken!);

      // 调用小红书OAuth刷新接口
      const response = await axios.post(
        'https://open.xiaohongshu.com/oauth2/refresh',
        {
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
          client_id: this.config.get('XIAOHONGSHU_APP_ID'),
          client_secret: this.config.get('XIAOHONGSHU_APP_SECRET'),
        },
      );

      if (response.data.error) {
        throw new Error(`Xiaohongshu token refresh failed: ${response.data.error_description}`);
      }

      const { access_token, refresh_token, expires_in } = response.data;

      // 计算过期时间
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // 更新令牌
      await this.prisma.socialMediaAccount.update({
        where: { id: accountId },
        data: {
          accessToken: CryptoUtil.encrypt(access_token),
          refreshToken: CryptoUtil.encrypt(refresh_token),
          expiresAt,
        },
      });

      this.logger.log(`Xiaohongshu token refreshed: ${accountId}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh Xiaohongshu token: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 刷新微信公众号令牌
   */
  async refreshWechatToken(accountId: string): Promise<boolean> {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== 'wechat') {
      throw new Error('Account not found or not a Wechat account');
    }

    try {
      // 公众号令牌刷新（通过refresh_token）
      if (account.refreshToken) {
        const decryptedRefreshToken = CryptoUtil.decrypt(account.refreshToken);

        const response = await axios.get(
          'https://api.weixin.qq.com/cgi-bin/token/refresh',
          {
            params: {
              grant_type: 'refresh_token',
              appid: this.config.get('WECHAT_APP_ID'),
              refresh_token: decryptedRefreshToken,
            },
          },
        );

        if (response.data.errcode !== 0) {
          throw new Error(`Wechat token refresh failed: ${response.data.errmsg}`);
        }

        const { access_token, expires_in } = response.data;

        // 更新令牌
        await this.prisma.socialMediaAccount.update({
          where: { id: accountId },
          data: {
            accessToken: CryptoUtil.encrypt(access_token),
            expiresAt: new Date(Date.now() + expires_in * 1000),
          },
        });

        this.logger.log(`Wechat token refreshed: ${accountId}`);
        return true;
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh Wechat token: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 根据平台刷新令牌
   */
  async refreshToken(accountId: string): Promise<boolean> {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    switch (account.platform) {
      case 'douyin':
        return await this.refreshDouyinToken(accountId);
      case 'xiaohongshu':
        return await this.refreshXiaohongshuToken(accountId);
      case 'wechat':
        return await this.refreshWechatToken(accountId);
      default:
        throw new Error(`Unsupported platform: ${account.platform}`);
    }
  }
}
```

**Step 2: 更新SocialMediaAccountService**

```typescript
// backend/src/modules/social-media/services/social-media-account.service.ts

@Injectable()
export class SocialMediaAccountService {
  constructor(
    private prisma: PrismaService,
    private tokenRefreshService: TokenRefreshService,
  ) {}

  /**
   * 刷新访问令牌（使用新的刷新服务）
   */
  async refreshAccessToken(id: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const account = await this.findById(id);
    if (!account) {
      throw new NotFoundException(`账号不存在: ${id}`);
    }

    if (!account.refreshToken) {
      throw new BadRequestException('该账号没有配置刷新令牌');
    }

    try {
      // 使用令牌刷新服务
      const success = await this.tokenRefreshService.refreshToken(id);

      if (!success) {
        throw new Error('Token refresh failed');
      }

      // 读取更新后的账号信息
      const updated = await this.findById(id);

      // 解密并返回新的访问令牌
      const decrypted = await this.decryptSensitiveInfo(updated!);

      return {
        accessToken: decrypted.accessToken!,
        expiresAt: decrypted.expiresAt!,
      };
    } catch (error: any) {
      this.logger.error(`刷新访问令牌失败: ${error.message}`);
      throw new BadRequestException(`刷新令牌失败: ${error.message}`);
    }
  }
}
```

**Step 3: 注册TokenRefreshService到模块**

```typescript
// backend/src/modules/social-media/social-media.module.ts
import { TokenRefreshService } from './providers/token-refresh.service';

@Module({
  providers: [
    // ...existing providers
    TokenRefreshService,
  ],
})
export class SocialMediaModule {}
```

**Step 4: 提交变更**

```bash
git add src/modules/social-media/
git commit -m "feat: 实现平台令牌自动刷新

- 创建TokenRefreshService
- 支持抖音、小红书、微信令牌刷新
- 调用各平台OAuth接口
- 自动更新加密的令牌

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 创建平台发布提供者

**Files:**
- Create: `backend/src/modules/social-media/providers/base-publisher.ts`
- Create: `backend/src/modules/social-media/providers/douyin.publisher.ts`
- Create: `backend/src/modules/social-media/providers/xiaohongshu.publisher.ts`
- Create: `backend/src/modules/social-media/providers/wechat.publisher.ts`

**Step 1: 创建基础发布者接口**

```typescript
// backend/src/modules/social-media/providers/base-publisher.ts
import { Logger } from '@nestjs/common';

export interface PublishContent {
  title: string;
  content?: string;
  videoUrl?: string;
  coverUrl?: string;
  images?: string[];
  topics?: string[];
  location?: string;
  visibility?: 'public' | 'friends' | 'private';
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export abstract class BasePublisher {
  protected readonly logger: Logger;

  constructor(name: string) {
    this.logger = new Logger(name);
  }

  /**
   * 上传视频素材
   */
  abstract uploadVideo(
    accountId: string,
    videoUrl: string,
  ): Promise<{ videoId: string; videoUrl: string }>;

  /**
   * 发布内容
   */
  abstract publish(
    accountId: string,
    content: PublishContent,
  ): Promise<PublishResult>;

  /**
   * 删除内容
   */
  abstract delete(accountId: string, postId: string): Promise<boolean>;

  /**
   * 查询发布状态
   */
  abstract getStatus(accountId: string, postId: string): Promise<any>;
}
```

**Step 2: 实现抖音发布者**

```typescript
// backend/src/modules/social-media/providers/douyin.publisher.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CryptoUtil } from '@/lib/crypto.util';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  BasePublisher,
  PublishContent,
  PublishResult,
} from './base-publisher';

@Injectable()
export class DouyinPublisher extends BasePublisher {
  private readonly apiUrl = 'https://developer.toutiao.com/api';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super('DouyinPublisher');
  }

  /**
   * 上传视频素材到抖音
   */
  async uploadVideo(
    accountId: string,
    videoUrl: string,
  ): Promise<{ videoId: string; videoUrl: string }> {
    const account = await this.getAccount(accountId);

    // 下载视频
    const videoBuffer = await this.downloadVideo(videoUrl);

    // 上传到抖音
    const formData = new FormData();
    formData.append('video', new Blob([videoBuffer]), 'video.mp4');
    formData.append('app_id', this.config.get('DOUYIN_APP_ID'));

    const response = await axios.post(
      `${this.apiUrl}/v1/video/upload/`,
      formData,
      {
        headers: {
          'X-Token': CryptoUtil.decrypt(account.accessToken),
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    if (response.data.code !== 0) {
      throw new Error(`Douyin video upload failed: ${response.data.message}`);
    }

    return {
      videoId: response.data.data.video_id,
      videoUrl: response.data.data.video_url,
    };
  }

  /**
   * 发布内容到抖音
   */
  async publish(accountId: string, content: PublishContent): Promise<PublishResult> {
    const account = await this.getAccount(accountId);

    try {
      // 1. 上传视频（如果有）
      let videoId = '';
      if (content.videoUrl) {
        const uploadResult = await this.uploadVideo(accountId, content.videoUrl);
        videoId = uploadResult.videoId;
      }

      // 2. 构建发布请求
      const requestData: any = {
        app_id: this.config.get('DOUYIN_APP_ID'),
        title: content.title,
        text: content.content || '',
      };

      if (videoId) {
        requestData.video_id = videoId;
      }

      if (content.topics && content.topics.length > 0) {
        requestData.words = content.topics.join(',');
      }

      if (content.location) {
        requestData.poi_name = content.location;
      }

      // 3. 发布内容
      const response = await axios.post(
        `${this.apiUrl}/v1/video/create/`,
        requestData,
        {
          headers: {
            'X-Token': CryptoUtil.decrypt(account.accessToken),
          },
        },
      );

      if (response.data.code !== 0) {
        return {
          success: false,
          error: response.data.message,
        };
      }

      return {
        success: true,
        postId: response.data.data.item_id,
        postUrl: response.data.data.share_url,
      };
    } catch (error: any) {
      this.logger.error(`Douyin publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 删除抖音内容
   */
  async delete(accountId: string, postId: string): Promise<boolean> {
    const account = await this.getAccount(accountId);

    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/video/delete/`,
        {
          item_id: postId,
          app_id: this.config.get('DOUYIN_APP_ID'),
        },
        {
          headers: {
            'X-Token': CryptoUtil.decrypt(account.accessToken),
          },
        },
      );

      return response.data.code === 0;
    } catch (error) {
      this.logger.error(`Douyin delete failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 查询抖音发布状态
   */
  async getStatus(accountId: string, postId: string): Promise<any> {
    const account = await this.getAccount(accountId);

    try {
      const response = await axios.get(`${this.apiUrl}/v1/video/query/`, {
        params: {
          item_ids: postId,
          app_id: this.config.get('DOUYIN_APP_ID'),
        },
        headers: {
          'X-Token': CryptoUtil.decrypt(account.accessToken),
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Douyin status query failed: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取账号信息
   */
  private async getAccount(accountId: string) {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.platform !== 'douyin') {
      throw new Error('Not a Douyin account');
    }

    return account;
  }

  /**
   * 下载视频
   */
  private async downloadVideo(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
```

**Step 3: 实现小红书发布者**

```typescript
// backend/src/modules/social-media/providers/xiaohongshu.publisher.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CryptoUtil } from '@/lib/crypto.util';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  BasePublisher,
  PublishContent,
  PublishResult,
} from './base-publisher';

@Injectable()
export class XiaohongshuPublisher extends BasePublisher {
  private readonly apiUrl = 'https://open.xiaohongshu.com';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super('XiaohongshuPublisher');
  }

  async uploadVideo(accountId: string, videoUrl: string) {
    // 类似抖音的实现
    // 小红书API可能不同，需要查阅官方文档
    throw new Error('Not implemented');
  }

  async publish(accountId: string, content: PublishContent): Promise<PublishResult> {
    const account = await this.getAccount(accountId);

    try {
      const requestData: any = {
        title: content.title,
        desc: content.content || '',
        type: 'normal', // 或 'video'如果有视频
        images: content.images || [],
      };

      if (content.topics) {
        requestData.topics = content.topics.join(',');
      }

      const response = await axios.post(
        `${this.apiUrl}/feeds/media/post`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${CryptoUtil.decrypt(account.accessToken)}`,
          },
        },
      );

      if (response.data.error) {
        return {
          success: false,
          error: response.data.error_description,
        };
      }

      return {
        success: true,
        postId: response.data.data.note_id,
        postUrl: response.data.data.note_url,
      };
    } catch (error: any) {
      this.logger.error(`Xiaohongshu publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async delete(accountId: string, postId: string): Promise<boolean> {
    // 实现删除逻辑
    return true;
  }

  async getStatus(accountId: string, postId: string): Promise<any> {
    // 实现状态查询逻辑
    return null;
  }

  private async getAccount(accountId: string) {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== 'xiaohongshu') {
      throw new Error('Invalid account');
    }

    return account;
  }
}
```

**Step 4: 实现微信发布者**

```typescript
// backend/src/modules/social-media/providers/wechat.publisher.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CryptoUtil } from '@/lib/crypto.util';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  BasePublisher,
  PublishContent,
  PublishResult,
} from './base-publisher';

@Injectable()
export class WechatPublisher extends BasePublisher {
  private readonly apiUrl = 'https://api.weixin.qq.com/cgi-bin';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super('WechatPublisher');
  }

  async uploadVideo(accountId: string, videoUrl: string) {
    // 微信视频号上传素材
    throw new Error('Not implemented');
  }

  async publish(accountId: string, content: PublishContent): Promise<PublishResult> {
    const account = await this.getAccount(accountId);

    try {
      const accessToken = CryptoUtil.decrypt(account.accessToken);

      // 1. 上传图片/视频素材（如果有）
      let mediaId = '';
      if (content.videoUrl || content.images) {
        mediaId = await this.uploadMedia(accountId, content, accessToken);
      }

      // 2. 发布草稿
      const requestData: any = {
        content: {
          title: content.title,
          content: content.content || '',
          media_id: mediaId,
        },
      };

      const response = await axios.post(
        `${this.apiUrl}/media/uploadnews`,
        requestData,
        {
          params: { access_token: accessToken },
        },
      );

      if (response.data.errcode !== 0) {
        return {
          success: false,
          error: response.data.errmsg,
        };
      }

      return {
        success: true,
        postId: response.data.media_id,
      };
    } catch (error: any) {
      this.logger.error(`Wechat publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async delete(accountId: string, postId: string): Promise<boolean> {
    // 实现删除逻辑
    return true;
  }

  async getStatus(accountId: string, postId: string): Promise<any> {
    // 实现状态查询逻辑
    return null;
  }

  private async getAccount(accountId: string) {
    const account = await this.prisma.socialMediaAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== 'wechat') {
      throw new Error('Invalid account');
    }

    return account;
  }

  private async uploadMedia(
    accountId: string,
    content: PublishContent,
    accessToken: string,
  ): Promise<string> {
    // 上传素材到微信
    // 返回media_id
    return '';
  }
}
```

**Step 5: 创建发布者工厂**

```typescript
// backend/src/modules/social-media/providers/publisher.factory.ts
import { Injectable } from '@nestjs/common';
import { DouyinPublisher } from './douyin.publisher';
import { XiaohongshuPublisher } from './xiaohongshu.publisher';
import { WechatPublisher } from './wechat.publisher';
import { BasePublisher } from './base-publisher';

@Injectable()
export class PublisherFactory {
  private publishers: Map<string, BasePublisher> = new Map();

  constructor(
    private douyinPublisher: DouyinPublisher,
    private xiaohongshuPublisher: XiaohongshuPublisher,
    private wechatPublisher: WechatPublisher,
  ) {
    this.publishers.set('douyin', douyinPublisher);
    this.publishers.set('xiaohongshu', xiaohongshuPublisher);
    this.publishers.set('wechat', wechatPublisher);
  }

  getPublisher(platform: string): BasePublisher {
    const publisher = this.publishers.get(platform);
    if (!publisher) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return publisher;
  }
}
```

**Step 6: 注册所有提供者到模块**

```typescript
// backend/src/modules/social-media/social-media.module.ts
import { DouyinPublisher } from './providers/douyin.publisher';
import { XiaohongshuPublisher } from './providers/xiaohongshu.publisher';
import { WechatPublisher } from './providers/wechat.publisher';
import { PublisherFactory } from './providers/publisher.factory';

@Module({
  providers: [
    DouyinPublisher,
    XiaohongshuPublisher,
    WechatPublisher,
    PublisherFactory,
  ],
  exports: [PublisherFactory],
})
export class SocialMediaModule {}
```

**Step 7: 提交变更**

```bash
git add src/modules/social-media/providers/
git commit -m "feat: 创建新媒体平台发布者

- BasePublisher: 基础发布者接口
- DouyinPublisher: 抖音内容发布
- XiaohongshuPublisher: 小红书内容发布
- WechatPublisher: 微信内容发布
- PublisherFactory: 发布者工厂

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 创建内容发布服务

**Files:**
- Create: `backend/src/modules/social-media/services/social-media-publisher.service.ts`

**Step 1: 创建发布服务**

```typescript
// backend/src/modules/social-media/services/social-media-publisher.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PublisherFactory } from '../providers/publisher.factory';
import { PublishContent } from '../providers/base-publisher';

@Injectable()
export class SocialMediaPublisherService {
  private readonly logger = new Logger(SocialMediaPublisherService.name);

  constructor(
    private prisma: PrismaService,
    private publisherFactory: PublisherFactory,
    @InjectQueue('social-media') private publishQueue: Queue,
  ) {}

  /**
   * 发布到单个平台
   */
  async publishToPlatform(
    postId: string,
    accountId: string,
  ): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
    // 获取内容
    const post = await this.prisma.socialMediaPost.findUnique({
      where: { id: postId },
      include: {
        account: true,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // 准备发布内容
    const content: PublishContent = {
      title: post.title,
      content: post.content,
      videoUrl: post.videoUrl,
      coverUrl: post.coverUrl,
      topics: post.topics ? JSON.parse(post.topics) : [],
      location: post.location,
      visibility: post.visibility as any,
    };

    // 获取平台发布者
    const publisher = this.publisherFactory.getPublisher(post.account.platform);

    // 发布内容
    const result = await publisher.publish(accountId, content);

    // 记录发布日志
    await this.prisma.socialMediaPublishLog.create({
      data: {
        postId,
        platform: post.account.platform,
        accountId,
        status: result.success ? 'success' : 'failed',
        postIdOnPlatform: result.postId,
        postUrl: result.postUrl,
        error: result.error,
        publishedAt: result.success ? new Date() : null,
      },
    });

    // 更新内容状态
    if (result.success) {
      await this.prisma.socialMediaPost.update({
        where: { id: postId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          publishData: JSON.stringify({
            [post.account.platform]: {
              postId: result.postId,
              postUrl: result.postUrl,
            },
          }),
        },
      });
    }

    return result;
  }

  /**
   * 发布到多个平台
   */
  async publishToMultiplePlatforms(
    postId: string,
    accountIds: string[],
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    results: any[];
  }> {
    this.logger.log(
      `Publishing post ${postId} to ${accountIds.length} platforms`,
    );

    // 并发发布到所有平台
    const promises = accountIds.map((accountId) =>
      this.publishToPlatform(postId, accountId),
    );

    const results = await Promise.allSettled(promises);

    // 统计结果
    let success = 0;
    let failed = 0;
    const detailedResults: any[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          success++;
        } else {
          failed++;
        }
        detailedResults.push(result.value);
      } else {
        failed++;
        detailedResults.push({
          success: false,
          error: result.reason.message,
        });
      }
    }

    this.logger.log(
      `Publish completed: ${success} success, ${failed} failed`,
    );

    return {
      total: accountIds.length,
      success,
      failed,
      results: detailedResults,
    };
  }

  /**
   * 异步发布（添加到队列）
   */
  async publishAsync(postId: string, accountIds: string[]) {
    for (const accountId of accountIds) {
      await this.publishQueue.add(
        'publish-post',
        {
          postId,
          accountId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    }

    this.logger.log(
      `Post ${postId} queued for ${accountIds.length} platforms`,
    );
  }

  /**
   * 重新发布（失败重试）
   */
  async republish(logId: string) {
    const log = await this.prisma.socialMediaPublishLog.findUnique({
      where: { id: logId },
      include: {
        post: true,
      },
    });

    if (!log) {
      throw new Error('Publish log not found');
    }

    // 重新发布
    return await this.publishToPlatform(log.postId, log.accountId);
  }
}
```

**Step 2: 创建发布队列处理器**

```typescript
// backend/src/modules/social-media/processors/publish.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SocialMediaPublisherService } from '../services/social-media-publisher.service';

@Processor('social-media')
export class PublishProcessor {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(private publisherService: SocialMediaPublisherService) {}

  @Process('publish-post')
  async handlePublish(job: Job) {
    const { postId, accountId } = job.data;

    this.logger.log(`Processing publish: ${postId} to ${accountId}`);

    try {
      const result = await this.publisherService.publishToPlatform(
        postId,
        accountId,
      );

      if (result.success) {
        this.logger.log(`Publish succeeded: ${postId}`);
      } else {
        this.logger.error(`Publish failed: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error: any) {
      this.logger.error(`Publish processing error: ${error.message}`);
      throw error;
    }
  }
}
```

**Step 3: 注册服务和处理器到模块**

```typescript
// backend/src/modules/social-media/social-media.module.ts
import { SocialMediaPublisherService } from '../services/social-media-publisher.service';
import { PublishProcessor } from './processors/publish.processor';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'social-media',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [
    SocialMediaPublisherService,
    PublishProcessor,
  ],
  exports: [SocialMediaPublisherService],
})
export class SocialMediaModule {}
```

**Step 4: 提交变更**

```bash
git add src/modules/social-media/
git commit -m "feat: 创建内容发布服务和队列

- SocialMediaPublisherService: 单/多平台发布
- PublishProcessor: 队列处理器
- 支持异步发布和失败重试

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 实现定时发布

**Files:**
- Modify: `backend/src/modules/scheduler/scheduler.service.ts`
- Create: `backend/src/modules/social-media/schedulers/publish.scheduler.ts`

**Step 1: 创建发布定时任务**

```typescript
// backend/src/modules/social-media/schedulers/publish.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SocialMediaPublisherService } from '../services/social-media-publisher.service';

@Injectable()
export class PublishScheduler {
  private readonly logger = new Logger(PublishScheduler.name);

  constructor(
    private prisma: PrismaService,
    private publisherService: SocialMediaPublisherService,
  ) {}

  /**
   * 每分钟检查定时发布任务
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPosts() {
    this.logger.log('[定时发布] 检查待发布内容...');

    try {
      // 查找需要发布的内容
      const scheduledPosts = await this.prisma.socialMediaPost.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: new Date(),
          },
        },
        include: {
          account: true,
        },
      });

      this.logger.log(`[定时发布] 发现 ${scheduledPosts.length} 个待发布内容`);

      for (const post of scheduledPosts) {
        try {
          // 更新状态为发布中
          await this.prisma.socialMediaPost.update({
            where: { id: post.id },
            data: {
              status: 'publishing',
            },
          });

          // 执行发布
          await this.publisherService.publishToPlatform(
            post.id,
            post.accountId,
          );

          this.logger.log(`[定时发布] 发布成功: ${post.id}`);
        } catch (error: any) {
          this.logger.error(
            `[定时发布] 发布失败: ${post.id}, ${error.message}`,
          );

          // 更新状态为失败
          await this.prisma.socialMediaPost.update({
            where: { id: post.id },
            data: {
              status: 'failed',
              error: error.message,
            },
          });
        }
      }

      this.logger.log('[定时发布] 检查完成');
    } catch (error) {
      this.logger.error('[定时发布] 检查失败', error);
    }
  }
}
```

**Step 2: 注册发布定时器到模块**

```typescript
// backend/src/modules/social-media/social-media.module.ts
import { PublishScheduler } from './schedulers/publish.scheduler';

@Module({
  providers: [
    // ...
    PublishScheduler,
  ],
})
export class SocialMediaModule {}
```

**Step 3: 提交变更**

```bash
git add src/modules/social-media/schedulers/
git commit -m "feat: 添加定时发布功能

- 每分钟检查待发布内容
- 到达发布时间自动触发
- 失败自动标记和记录

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 创建发布管理API

**Files:**
- Create: `backend/src/modules/social-media/social-media-publish.controller.ts`

**Step 1: 创建发布控制器**

```typescript
// backend/src/modules/social-media/social-media-publish.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialMediaPublisherService } from './services/social-media-publisher.service';

@ApiTags('social-media-publish')
@Controller('social-media/publish')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialMediaPublishController {
  constructor(private publisherService: SocialMediaPublisherService) {}

  @Post('single')
  @ApiOperation({ summary: '发布到单个平台' })
  async publishSingle(@Body() dto: { postId: string; accountId: string }) {
    return await this.publisherService.publishToPlatform(
      dto.postId,
      dto.accountId,
    );
  }

  @Post('multiple')
  @ApiOperation({ summary: '发布到多个平台' })
  async publishMultiple(@Body() dto: { postId: string; accountIds: string[] }) {
    return await this.publisherService.publishToMultiplePlatforms(
      dto.postId,
      dto.accountIds,
    );
  }

  @Post('async')
  @ApiOperation({ summary: '异步发布（队列）' })
  async publishAsync(@Body() dto: { postId: string; accountIds: string[] }) {
    await this.publisherService.publishAsync(dto.postId, dto.accountIds);
    return {
      message: 'Posts queued for publishing',
      count: dto.accountIds.length,
    };
  }

  @Post('republish/:logId')
  @ApiOperation({ summary: '重新发布失败的内容' })
  async republish(@Param('logId') logId: string) {
    return await this.publisherService.republish(logId);
  }

  @Get('logs/:postId')
  @ApiOperation({ summary: '查询发布日志' })
  async getLogs(
    @Param('postId') postId: string,
    @Query() query: { page?: number; pageSize?: number },
  ) {
    // 实现日志查询逻辑
    return {};
  }
}
```

**Step 2: 注册控制器**

```typescript
// backend/src/modules/social-media/social-media.module.ts
import { SocialMediaPublishController } from './social-media-publish.controller';

@Module({
  controllers: [
    // ...existing controllers
    SocialMediaPublishController,
  ],
})
export class SocialMediaModule {}
```

**Step 3: 测试API**

```bash
# 单平台发布
curl -X POST http://localhost:7890/api/social-media/publish/single \
  -H "Content-Type: application/json" \
  -d '{"postId":"xxx","accountId":"xxx"}'

# 多平台发布
curl -X POST http://localhost:7890/api/social-media/publish/multiple \
  -H "Content-Type: application/json" \
  -d '{"postId":"xxx","accountIds":["xxx","yyy"]}'

# 异步发布
curl -X POST http://localhost:7890/api/social-media/publish/async \
  -H "Content-Type: application/json" \
  -d '{"postId":"xxx","accountIds":["xxx","yyy"]}'
```

**Step 4: 提交变更**

```bash
git add src/modules/social-media/social-media-publish.controller.ts
git commit -m "feat: 添加新媒体发布管理API

- 单平台发布接口
- 多平台发布接口
- 异步发布队列
- 重新发布接口
- 发布日志查询

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: 添加令牌过期检查定时任务

**Files:**
- Modify: `backend/src/modules/social-media/schedulers/token-refresh.scheduler.ts`

**Step 1: 创建令牌刷新定时任务**

```typescript
// backend/src/modules/social-media/schedulers/token-refresh.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TokenRefreshService } from '../providers/token-refresh.service';

@Injectable()
export class TokenRefreshScheduler {
  private readonly logger = new Logger(TokenRefreshScheduler.name);

  constructor(
    private prisma: PrismaService,
    private tokenRefreshService: TokenRefreshService,
  ) {}

  /**
   * 每小时检查即将过期的令牌
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringTokens() {
    this.logger.log('[令牌刷新] 检查即将过期的令牌...');

    try {
      // 查找1小时内过期的账号
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);

      const expiringAccounts = await this.prisma.socialMediaAccount.findMany({
        where: {
          status: 1,
          expiresAt: {
            lte: oneHourLater,
          },
          refreshToken: {
            not: null,
          },
        },
      });

      this.logger.log(`[令牌刷新] 发现 ${expiringAccounts.length} 个即将过期的账号`);

      for (const account of expiringAccounts) {
        try {
          const success = await this.tokenRefreshService.refreshToken(account.id);

          if (success) {
            this.logger.log(`[令牌刷新] 成功: ${account.accountName}`);
          } else {
            this.logger.warn(`[令牌刷新] 失败: ${account.accountName}`);
          }
        } catch (error: any) {
          this.logger.error(
            `[令牌刷新] 异常: ${account.accountName}, ${error.message}`,
          );
        }
      }

      this.logger.log('[令牌刷新] 检查完成');
    } catch (error) {
      this.logger.error('[令牌刷新] 检查失败', error);
    }
  }
}
```

**Step 2: 注册到模块**

```typescript
// backend/src/modules/social-media/social-media.module.ts
import { TokenRefreshScheduler } from './schedulers/token-refresh.scheduler';

@Module({
  providers: [
    // ...
    TokenRefreshScheduler,
  ],
})
export class SocialMediaModule {}
```

**Step 3: 提交变更**

```bash
git add src/modules/social-media/schedulers/token-refresh.scheduler.ts
git commit -m "feat: 添加令牌自动刷新定时任务

- 每小时检查即将过期的令牌
- 自动调用OAuth接口刷新
- 记录刷新成功/失败日志

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

- ✅ 令牌自动刷新功能正常
- ✅ 支持抖音、小红书、微信三个平台
- ✅ 单平台发布API正常工作
- ✅ 多平台同时发布功能正常
- ✅ 定时发布准确触发
- ✅ 发布失败自动重试
- ✅ 发布日志完整记录
- ✅ 队列处理正常工作

---

**预估时间**: 3天
