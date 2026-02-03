import * as crypto from 'crypto';

/**
 * 加密工具类
 * 使用 AES-256-GCM 进行加密/解密
 */
export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * 从环境变量获取加密密钥
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-bytes-long!';
    return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
  }

  /**
   * 加密文本
   * @param text 待加密的文本
   * @returns 加密后的文本（格式: iv:authTag:encrypted）
   */
  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const key = this.getEncryptionKey();
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // 返回格式: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  /**
   * 解密文本
   * @param encryptedText 加密的文本（格式: iv:authTag:encrypted）
   * @returns 解密后的原文
   */
  static decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('无效的加密格式');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`解密失败: ${error.message}`);
    }
  }

  /**
   * 加密对象
   * @param obj 待加密的对象
   * @returns 加密后的文本
   */
  static encryptObject(obj: Record<string, any>): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * 解密对象
   * @param encryptedText 加密的文本
   * @returns 解密后的对象
   */
  static decryptObject<T = any>(encryptedText: string): T {
    const decrypted = this.decrypt(encryptedText);
    return JSON.parse(decrypted);
  }

  /**
   * 生成随机字符串
   * @param length 字符串长度
   * @returns 随机字符串
   */
  static randomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * 生成哈希值
   * @param data 待哈希的数据
   * @returns SHA256 哈希值
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
