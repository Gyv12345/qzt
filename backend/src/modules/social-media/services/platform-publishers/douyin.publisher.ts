import { Injectable, Logger } from '@nestjs/common';
import { IPlatformPublisher, PublishData, PublishResult, UploadResult, TokenResult, AccountStatus } from '../../interfaces/platform-publisher.interface';
import axios from 'axios';

/**
 * 抖音开放平台发布器
 */
@Injectable()
export class DouyinPublisher implements IPlatformPublisher {
  readonly platform = 'douyin';
  private readonly logger = new Logger(DouyinPublisher.name);
  private readonly baseUrl = 'https://open.douyin.com';
  private readonly apiVersion = 'v1.0';

  /**
   * 发布内容到抖音
   */
  async publishVideo(params: PublishData): Promise<PublishResult> {
    try {
      this.logger.log(`开始发布到抖音: ${params.title}`);

      // 验证账号信息
      if (!params.account.appId || !params.account.accessToken) {
        return {
          success: false,
          error: '账号配置不完整，缺少 appId 或 accessToken',
        };
      }

      // 1. 上传视频
      const uploadResult = await this.uploadVideo(params.videoUrl);
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || '视频上传失败',
        };
      }
      const videoId = uploadResult.videoId;

      // 2. 创建发布草稿
      const draftData = {
        app_id: params.account.appId,
        text: this.formatContent(params),
        video_id: videoId,
        cover_url: params.coverUrl,
        poi_id: params.location,
        visibility: this.mapVisibility(params.visibility),
      };

      // 3. 提交发布
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/video/publish/`,
        draftData,
        {
          headers: {
            'access-token': params.account.accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.data?.error_code === 0) {
        this.logger.log(`抖音发布成功: ${response.data.data.item_id}`);
        return {
          success: true,
          postId: response.data.data.item_id,
          postUrl: response.data.data.share_url,
        };
      } else {
        this.logger.error(`抖音发布失败: ${response.data.data?.description}`);
        return {
          success: false,
          error: response.data.data?.description || '发布失败',
        };
      }
    } catch (error) {
      this.logger.error(`抖音发布异常: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 上传视频到抖音
   */
  async uploadVideo(fileUrl: string): Promise<UploadResult> {
    try {
      // 1. 获取上传地址
      const uploadResponse = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/video/upload/init/`,
        {
          params: {
            video_size: await this.getVideoSize(fileUrl),
          },
        },
      );

      if (uploadResponse.data.data?.error_code !== 0) {
        return {
          success: false,
          error: `获取上传地址失败: ${uploadResponse.data.data?.description}`,
        };
      }

      const uploadUrl = uploadResponse.data.data.upload_url;
      const videoId = uploadResponse.data.data.video_id;

      // 2. 分片上传视频
      await this.uploadVideoChunk(uploadUrl, fileUrl);

      return {
        success: true,
        videoId,
        videoUrl: uploadUrl,
      };
    } catch (error) {
      this.logger.error(`上传视频失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/oauth/refresh_token/`,
        {
          refresh_token: refreshToken,
        },
      );

      if (response.data.data?.error_code === 0) {
        return {
          success: true,
          accessToken: response.data.data.access_token,
          expiresIn: response.data.data.expires_in,
        };
      } else {
        return {
          success: false,
          error: response.data.data?.description || '刷新令牌失败',
        };
      }
    } catch (error) {
      this.logger.error(`刷新令牌失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取账号信息
   */
  async getAccountInfo(accessToken: string): Promise<AccountStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/user/info/`,
        {
          headers: {
            'access-token': accessToken,
          },
        },
      );

      if (response.data.data?.error_code === 0) {
        return {
          success: true,
          accountInfo: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.data?.description || '获取账号信息失败',
        };
      }
    } catch (error) {
      this.logger.error(`获取账号信息失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 格式化内容
   */
  private formatContent(data: PublishData): string {
    let content = data.description || '';

    // 添加话题标签
    if (data.topics && data.topics.length > 0) {
      const topics = data.topics.map((topic) => `#${topic}`).join(' ');
      content = content ? `${content}\n${topics}` : topics;
    }

    return content;
  }

  /**
   * 映射可见性
   */
  private mapVisibility(visibility?: string): number {
    const map: Record<string, number> = {
      public: 0,
      friends: 1,
      private: 2,
    };
    return map[visibility || 'public'] || 0;
  }

  /**
   * 获取视频大小
   */
  private async getVideoSize(videoUrl: string): Promise<number> {
    const response = await axios.head(videoUrl);
    const contentLength = response.headers['content-length'];
    return parseInt(contentLength, 10);
  }

  /**
   * 分片上传视频
   */
  private async uploadVideoChunk(uploadUrl: string, videoUrl: string): Promise<void> {
    // 下载视频
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(videoResponse.data);

    // 上传视频
    await axios.put(uploadUrl, videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
      },
    });
  }
}
