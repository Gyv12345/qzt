/**
 * 平台发布器接口
 * 各平台发布器需要实现此接口
 */
export interface IPlatformPublisher {
  /**
   * 平台名称
   */
  readonly platform: string

  /**
   * 发布视频
   */
  publishVideo(params: PublishData): Promise<PublishResult>

  /**
   * 上传视频文件
   */
  uploadVideo(fileUrl: string): Promise<UploadResult>

  /**
   * 刷新访问令牌
   */
  refreshToken(refreshToken: string): Promise<TokenResult>

  /**
   * 获取账号信息
   */
  getAccountInfo(accessToken: string): Promise<AccountStatus>
}

/**
 * 发布数据类型
 */
export interface PublishData {
  title: string
  description?: string
  videoUrl: string
  coverUrl?: string
  topics?: string[]
  location?: string
  visibility?: string
  account?: any
}

/**
 * 发布结果类型
 */
export interface PublishResult {
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
}

/**
 * 上传结果类型
 */
export interface UploadResult {
  success: boolean
  videoId?: string
  videoUrl?: string
  error?: string
}

/**
 * 令牌结果类型
 */
export interface TokenResult {
  success: boolean
  accessToken?: string
  expiresIn?: number
  error?: string
}

/**
 * 账号状态类型
 */
export interface AccountStatus {
  success: boolean
  accountInfo?: any
  error?: string
}
