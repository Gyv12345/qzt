import { Injectable, Logger } from "@nestjs/common";
import {
  IPlatformPublisher,
  PublishData,
  PublishResult,
  UploadResult,
  TokenResult,
  AccountStatus,
} from "../../interfaces/platform-publisher.interface";
import axios from "axios";
import * as FormData from "form-data";

/**
 * 小红书开放平台发布器
 */
@Injectable()
export class XiaohongshuPublisher implements IPlatformPublisher {
  readonly platform = "xiaohongshu";
  private readonly logger = new Logger(XiaohongshuPublisher.name);
  private readonly baseUrl = "https://open.xiaohongshu.com";
  private readonly apiVersion = "v1";

  /**
   * 发布内容到小红书
   */
  async publishVideo(params: PublishData): Promise<PublishResult> {
    try {
      this.logger.log(`开始发布到小红书: ${params.title}`);

      // 验证账号信息
      if (!params.account.appId || !params.account.accessToken) {
        return {
          success: false,
          error: "账号配置不完整，缺少 appId 或 accessToken",
        };
      }

      // 1. 上传图片/视频
      const uploadResult = await this.uploadVideo(
        params.videoUrl,
        params.coverUrl,
      );
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || "媒体上传失败",
        };
      }
      const mediaId = uploadResult.videoId;

      // 2. 发布笔记
      const noteData = {
        title: params.title,
        desc: this.formatContent(params),
        media_type: "video",
        media_id: mediaId,
        post_time: new Date().getTime(),
        poi_id: params.location,
        visibility: this.mapVisibility(params.visibility),
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/note/publish`,
        noteData,
        {
          headers: {
            Authorization: `Bearer ${params.account.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.code === 0) {
        this.logger.log(`小红书发布成功: ${response.data.data.note_id}`);
        return {
          success: true,
          postId: response.data.data.note_id,
          postUrl: response.data.data.note_url,
        };
      } else {
        this.logger.error(`小红书发布失败: ${response.data.msg}`);
        return {
          success: false,
          error: response.data.msg || "发布失败",
        };
      }
    } catch (error) {
      this.logger.error(`小红书发布异常: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 上传媒体文件到小红书
   */
  async uploadVideo(fileUrl: string, coverUrl?: string): Promise<UploadResult> {
    try {
      // 1. 获取上传 ticket
      const ticketResponse = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/media/upload_ticket`,
        {
          media_type: "video",
        },
      );

      if (ticketResponse.data.code !== 0) {
        return {
          success: false,
          error: `获取上传 ticket 失败: ${ticketResponse.data.msg}`,
        };
      }

      const ticket = ticketResponse.data.data.ticket;
      const uploadUrl = ticketResponse.data.data.upload_url;

      // 2. 上传视频文件
      const form = new FormData();
      const videoBuffer = await this.downloadFile(fileUrl);
      form.append("file", videoBuffer, "video.mp4");

      if (coverUrl) {
        const coverBuffer = await this.downloadFile(coverUrl);
        form.append("cover", coverBuffer, "cover.jpg");
      }

      await axios.post(uploadUrl, form, {
        headers: form.getHeaders(),
      });

      // 3. 确认上传完成
      const confirmResponse = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/media/upload_confirm`,
        {
          ticket: ticket,
        },
      );

      if (confirmResponse.data.code !== 0) {
        return {
          success: false,
          error: `确认上传失败: ${confirmResponse.data.msg}`,
        };
      }

      return {
        success: true,
        videoId: confirmResponse.data.data.media_id,
        videoUrl: uploadUrl,
      };
    } catch (error) {
      this.logger.error(`上传媒体文件失败: ${error.message}`);
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
        `${this.baseUrl}/${this.apiVersion}/oauth/refresh_token`,
        {
          refresh_token: refreshToken,
        },
      );

      if (response.data.code === 0) {
        return {
          success: true,
          accessToken: response.data.data.access_token,
          expiresIn: response.data.data.expires_in,
        };
      } else {
        return {
          success: false,
          error: response.data.msg || "刷新令牌失败",
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
        `${this.baseUrl}/${this.apiVersion}/user/info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.data.code === 0) {
        return {
          success: true,
          accountInfo: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.msg || "获取账号信息失败",
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
    let content = data.description || "";

    // 添加话题标签
    if (data.topics && data.topics.length > 0) {
      const topics = data.topics.map((topic) => `#${topic}`).join(" ");
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
    return map[visibility || "public"] || 0;
  }

  /**
   * 下载文件
   */
  private async downloadFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data);
  }

  /**
   * 上传媒体文件（辅助方法）
   */
  private async uploadMedia(
    videoUrl: string,
    coverUrl: string | undefined,
    accessToken: string,
  ): Promise<string | undefined> {
    const result = await this.uploadVideo(videoUrl, coverUrl);
    return result.videoId;
  }
}
