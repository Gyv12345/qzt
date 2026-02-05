import { Module } from '@nestjs/common';
import { SocialMediaAccountController } from './social-media-account.controller';
import { SocialMediaPostController } from './social-media-post.controller';
import { SocialMediaAccountService } from './services/social-media-account.service';
import { SocialMediaPostService } from './services/social-media-post.service';
import { PlatformPublisherFactory } from './services/platform-publishers/factory';
import { DouyinPublisher } from './services/platform-publishers/douyin.publisher';
import { XiaohongshuPublisher } from '@/modules/social-media/services/platform-publishers';
import { WechatPublisher } from './services/platform-publishers/wechat.publisher';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  controllers: [
    SocialMediaAccountController,
    SocialMediaPostController,
  ],
  providers: [
    SocialMediaAccountService,
    SocialMediaPostService,
    PlatformPublisherFactory,
    DouyinPublisher,
    XiaohongshuPublisher,
    WechatPublisher,
    PrismaService,
  ],
  exports: [
    SocialMediaAccountService,
    SocialMediaPostService,
    PlatformPublisherFactory,
  ],
})
export class SocialMediaModule {}
