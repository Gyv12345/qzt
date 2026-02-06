/**
 * 新媒体账号接口
 */
export interface ISocialMediaAccountService {
  /**
   * 创建账号
   */
  create(data: {
    platform: string;
    accountName: string;
    appId?: string;
    appSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  }): Promise<any>;

  /**
   * 更新账号
   */
  update(
    id: string,
    data: Partial<{
      accountName: string;
      appId: string;
      appSecret: string;
      accessToken: string;
      refreshToken: string;
      status: number;
    }>,
  ): Promise<any>;

  /**
   * 删除账号
   */
  delete(id: string): Promise<any>;

  /**
   * 根据ID查找账号
   */
  findById(id: string): Promise<any>;

  /**
   * 查询账号列表
   */
  findAll(params: {
    platform?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }): Promise<any>;

  /**
   * 刷新访问令牌
   */
  refreshAccessToken(
    id: string,
  ): Promise<{ accessToken: string; expiresAt: Date }>;

  /**
   * 验证账号有效性
   */
  validateAccount(id: string): Promise<boolean>;
}
