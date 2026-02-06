import { Injectable, Logger } from "@nestjs/common";
import { IPlatformPublisher } from "../../interfaces/platform-publisher.interface";
import { DouyinPublisher } from "./douyin.publisher";
import { XiaohongshuPublisher } from "./xiaohongshu.publisher";
import { WechatPublisher } from "./wechat.publisher";

@Injectable()
export class PlatformPublisherFactory {
  private readonly logger = new Logger(PlatformPublisherFactory.name);

  private readonly publishers: Map<string, IPlatformPublisher> = new Map();

  constructor(
    private readonly douyinPublisher: DouyinPublisher,
    private readonly xiaohongshuPublisher: XiaohongshuPublisher,
    private readonly wechatPublisher: WechatPublisher,
  ) {
    this.publishers.set("douyin", this.douyinPublisher);
    this.publishers.set("xiaohongshu", this.xiaohongshuPublisher);
    this.publishers.set("wechat", this.wechatPublisher);
  }

  /**
   * 根据平台类型获取对应的发布器
   */
  getPublisher(platform: string): IPlatformPublisher {
    const publisher = this.publishers.get(platform);

    if (!publisher) {
      this.logger.warn(`不支持的平台: ${platform}`);
      throw new Error(`不支持的平台: ${platform}`);
    }

    return publisher;
  }

  /**
   * 获取所有支持的平台
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.publishers.keys());
  }
}
