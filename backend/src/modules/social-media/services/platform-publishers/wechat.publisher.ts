import { Injectable, Logger } from '@nestjs/common';
import { IPlatformPublisher, PublishData, PublishResult, UploadResult, TokenResult, AccountStatus } from '../../interfaces/platform-publisher.interface';
import axios from 'axios';
import * as FormData from 'form-data';

/**
 * 微信视频号发布器
 */
@Injectable()
export class WechatPublisher implements IPlatformPublisher {
  readonly platform = 'wechat';
  private readonly logger = new Logger(WechatPublisher.name);
  private readonly baseUrl = 'https://api.weixin.qq.com';
  private readonly apiVersion = 'cgi-bin';

  /**
   * 发布内容到微信视频号
   */
  async publishVideo(params: PublishData): Promise<PublishResult> {
    try {
      this.logger.log(`开始发布到微信视频号: ${params.title}`);

      // 验证账号信息
      if (!params.account.appId || !params.account.accessToken) {
        return {
          success: false,
          error: '账号配置不完整，缺少 appId 或 accessToken',
        };
      }

      // 1. 上传视频素材
      const uploadResult = await this.uploadVideo(params.videoUrl);
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || '视频上传失败',
        };
      }
      const mediaId = uploadResult.videoId;

      // 2. 创建发布任务
      const publishData = {
        media_id: mediaId,
        thumb_media_id: params.coverUrl ? await this.uploadCover(params.coverUrl, params.account.accessToken) : undefined,
        title: params.title,
        desc: this.formatContent(params),
        see_scope: this.mapVisibility(params.visibility),
        locate_id: params.location,
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/channels/video/addvideo?access_token=${params.account.accessToken}`,
        publishData,
      );

      if (response.data.errcode === 0) {
        this.logger.log(`微信视频号发布成功: ${response.data.media_id}`);
        return {
          success: true,
          postId: response.data.media_id,
          postUrl: response.data.publish_url,
        };
      } else {
        this.logger.error(`微信视频号发布失败: ${response.data.errmsg}`);
        return {
          success: false,
          error: response.data.errmsg || '发布失败',
        };
      }
    } catch (error) {
      this.logger.error(`微信视频号发布异常: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 上传视频到微信
   */
  async uploadVideo(fileUrl: string): Promise<UploadResult> {
    try {
      const form = new FormData();
      const videoBuffer = await this.downloadFile(fileUrl);
      form.append('media', videoBuffer, { filename: 'video.mp4', contentType: 'video/mp4' });
      form.append('type', 'video');

      // 需要accessToken，但接口定义中没有，这里需要重新设计
      // 暂时返回错误，提示需要额外参数
      this.logger.warn('微信视频上传需要accessToken，请使用其他方式调用');

      return {
        success: false,
        error: '微信视频上传需要accessToken参数',
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
   * 上传视频到微信（带token）
   */
  async uploadVideoWithToken(videoUrl: string, accessToken: string): Promise<string> {
    try {
      const form = new FormData();
      const videoBuffer = await this.downloadFile(videoUrl);
      form.append('media', videoBuffer, { filename: 'video.mp4', contentType: 'video/mp4' });
      form.append('type', 'video');

      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/media/upload?access_token=${accessToken}&type=video`,
        form,
        {
          headers: form.getHeaders(),
        },
      );

      if (response.data.errcode === 0) {
        return response.data.media_id;
      } else {
        throw new Error(`上传视频失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      this.logger.error(`上传视频失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 上传封面图
   */
  private async uploadCover(coverUrl: string, accessToken: string): Promise<string> {
    try {
      const form = new FormData();
      const coverBuffer = await this.downloadFile(coverUrl);
      form.append('media', coverBuffer, { filename: 'cover.jpg', contentType: 'image/jpeg' });
      form.append('type', 'thumb');

      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/media/upload?access_token=${accessToken}&type=thumb`,
        form,
        {
          headers: form.getHeaders(),
        },
      );

      if (response.data.errcode === 0) {
        return response.data.media_id;
      } else {
        throw new Error(`上传封面失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      this.logger.error(`上传封面失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/token?grant_type=refresh_token&refresh_token=${refreshToken}`,
      );

      if (response.data.errcode === 0) {
        return {
          success: true,
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in,
        };
      } else {
        return {
          success: false,
          error: response.data.errmsg || '刷新令牌失败',
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
        `${this.baseUrl}/${this.apiVersion}/account/getinfo?access_token=${accessToken}`,
      );

      if (response.data.errcode === 0) {
        return {
          success: true,
          accountInfo: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data.errmsg || '获取账号信息失败',
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
      const topics = data.topics.map((topic) => `#${topic}#`).join(' ');
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
   * 下载文件
   */
  private async downloadFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  /**
   * 上传媒体文件（辅助方法）
   */
  private async uploadMedia(videoUrl: string, coverUrl: string | undefined, accessToken: string): Promise<string> {
    return this.uploadVideoWithToken(videoUrl, accessToken);
  }
}
