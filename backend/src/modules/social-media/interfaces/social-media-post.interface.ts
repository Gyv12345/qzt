import { SocialMediaPost, SocialMediaAccount, OssFile } from '@prisma/client';

type SocialMediaPostWithRelations = SocialMediaPost & {
  account: SocialMediaAccount;
  videoFile: OssFile | null;
  coverFile: OssFile | null;
};

/**
 * 新媒体内容接口
 */
export interface ISocialMediaPostService {
  /**
   * 创建内容
   */
  create(data: {
    accountId: string
    title: string
    content?: string
    videoFileId?: string
    coverFileId?: string
    topics?: string[]
    location?: string
    visibility?: string
    scheduledAt?: string
  }): Promise<SocialMediaPostWithRelations>

  /**
   * 更新内容
   */
  update(id: string, data: Partial<{
    title: string
    content: string
    videoFileId: string
    coverFileId: string
    topics: string[]
    location: string
    visibility: string
    scheduledAt: string
    status: string
  }>): Promise<SocialMediaPostWithRelations>

  /**
   * 删除内容
   */
  delete(id: string): Promise<SocialMediaPostWithRelations>

  /**
   * 根据ID查找内容
   */
  findById(id: string): Promise<SocialMediaPostWithRelations | null>

  /**
   * 查询内容列表
   */
  findAll(params: {
    accountId?: string
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: SocialMediaPostWithRelations[]; total: number }>

  /**
   * 发布内容到平台
   */
  publish(id: string): Promise<SocialMediaPostWithRelations>

  /**
   * 定时发布内容
   */
  schedulePublish(id: string, scheduledAt: Date): Promise<SocialMediaPostWithRelations>

  /**
   * 取消定时发布
   */
  cancelScheduled(id: string): Promise<SocialMediaPostWithRelations>

  /**
   * 批量发布
   */
  batchPublish(ids: string[]): Promise<SocialMediaPostWithRelations[]>
}
