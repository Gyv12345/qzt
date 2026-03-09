import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * 企业微信签名验证 Guard
 * 验证企业微信消息的签名
 */
@Injectable()
export class WeworkSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WeworkSignatureGuard.name);
  private readonly token: string;
  private readonly encodingAesKey: string;

  constructor(private configService: ConfigService) {
    this.token = this.configService.get<string>("WEWORK_TOKEN") || "";
    this.encodingAesKey =
      this.configService.get<string>("WEWORK_ENCODING_AES_KEY") || "";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 获取查询参数中的签名信息
    const { msg_signature, timestamp, nonce } = request.query;

    // 如果没有配置 Token，跳过验证（开发环境）
    if (!this.token) {
      this.logger.warn("企业微信 Token 未配置，跳过签名验证");
      return true;
    }

    // 验证必要参数
    if (!msg_signature || !timestamp || !nonce) {
      throw new ForbiddenException("缺少必要的签名参数");
    }

    // 验证时间戳（防止重放攻击，5分钟内有效）
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNum) > 300) {
      throw new ForbiddenException("请求已过期");
    }

    // 获取请求体
    const body = request.body;
    const echostr = body.echostr || "";

    // 计算签名
    const signature = this.calculateSignature(
      this.token,
      timestamp,
      nonce,
      echostr,
    );

    if (signature !== msg_signature) {
      this.logger.warn(
        `签名验证失败: 期望 ${signature}, 实际 ${msg_signature}`,
      );
      throw new ForbiddenException("签名验证失败");
    }

    return true;
  }

  /**
   * 计算签名
   */
  private calculateSignature(
    token: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): string {
    const arr = [token, timestamp, nonce, echostr].sort();
    const str = arr.join("");
    return crypto.createHash("sha1").update(str).digest("hex");
  }

  /**
   * 解密消息（如果配置了 EncodingAESKey）
   */
  decryptMessage(encryptedMsg: string): string {
    if (!this.encodingAesKey) {
      return encryptedMsg;
    }

    try {
      const key = Buffer.from(this.encodingAesKey + "=", "base64");
      const iv = key.slice(0, 16);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      decipher.setAutoPadding(false);

      let decoded = decipher.update(encryptedMsg, "base64", "utf8");
      decoded += decipher.final("utf8");

      // 去除补位字符
      const pad = decoded.charCodeAt(decoded.length - 1);
      return decoded.slice(0, -pad);
    } catch (error) {
      this.logger.error(`消息解密失败: ${error}`);
      return encryptedMsg;
    }
  }
}
