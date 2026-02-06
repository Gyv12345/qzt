import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { CertificateConfigDto, CertificateType } from "../dto/certificate.dto";

/**
 * 证书管理服务
 * 负责证书文件的读取、保存、验证等操作
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly certBasePath =
    process.env.CERT_BASE_PATH || "/opt/qzt/certificates";

  constructor(private config: ConfigService) {}

  /**
   * 读取证书文件内容
   */
  getCertificate(
    paymentMethod: string,
    certificateType: CertificateType,
    environment: "development" | "production" = "development",
  ): string {
    const certPath = this.getCertificatePath(
      paymentMethod,
      certificateType,
      environment,
    );

    try {
      if (fs.existsSync(certPath)) {
        return fs.readFileSync(certPath, "utf8");
      }

      // 尝试从环境变量读取
      const envKey = this.getEnvKey(paymentMethod, certificateType);
      const envValue = this.config.get(envKey);

      if (envValue) {
        this.logger.warn(`使用环境变量 ${envKey}`);
        return envValue;
      }

      throw new NotFoundException(
        `Certificate not found: ${paymentMethod}/${certificateType}`,
      );
    } catch (error: any) {
      this.logger.error(`读取证书失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存证书文件
   */
  saveCertificate(
    paymentMethod: string,
    certificateType: CertificateType,
    content: string,
    environment: "development" | "production" = "development",
  ): { success: boolean; path: string; error?: string } {
    try {
      const certPath = this.getCertificatePath(
        paymentMethod,
        certificateType,
        environment,
      );

      // 确保目录存在
      const certDir = path.dirname(certPath);
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }

      // 写入证书文件
      fs.writeFileSync(certPath, content, { mode: 0o600 });

      this.logger.log(`证书已保存: ${certPath}`);

      return {
        success: true,
        path: certPath,
      };
    } catch (error: any) {
      this.logger.error(`保存证书失败: ${error.message}`);
      return {
        success: false,
        path: "",
        error: error.message,
      };
    }
  }

  /**
   * 验证证书配置
   */
  async verifyCertificates(
    paymentMethod: "wechat" | "alipay",
    environment: "development" | "production",
  ): Promise<{
    valid: boolean;
    certificates: string[];
    missing: string[];
  }> {
    const certificates: string[] = [];
    const missing: string[] = [];

    const requiredCerts =
      paymentMethod === "wechat"
        ? [
            CertificateType.WECHAT_APICLIENT_CERT,
            CertificateType.WECHAT_PRIVATE_KEY,
            CertificateType.WECHAT_PUBLIC_KEY,
            CertificateType.WECHAT_API_KEY,
          ]
        : [
            CertificateType.ALIPAY_PRIVATE_KEY,
            CertificateType.ALIPAY_PUBLIC_KEY,
          ];

    for (const certType of requiredCerts) {
      try {
        this.getCertificate(paymentMethod, certType, environment);
        certificates.push(certType);
      } catch (error) {
        missing.push(certType);
      }
    }

    return {
      valid: missing.length === 0,
      certificates,
      missing,
    };
  }

  /**
   * 获取证书文件路径
   */
  private getCertificatePath(
    paymentMethod: string,
    certificateType: CertificateType,
    environment: string,
  ): string {
    const filename = this.getFilename(certificateType);
    return path.join(this.certBasePath, paymentMethod, environment, filename);
  }

  /**
   * 获取证书文件名
   */
  private getFilename(certificateType: CertificateType): string {
    const fileNames: Record<CertificateType, string> = {
      [CertificateType.WECHAT_APICLIENT_CERT]: "apiclient_cert.p12",
      [CertificateType.WECHAT_PRIVATE_KEY]: "apiclient_key.pem",
      [CertificateType.WECHAT_PUBLIC_KEY]: "platform_public_key.pem",
      [CertificateType.WECHAT_API_KEY]: "api_key.txt",
      [CertificateType.ALIPAY_PRIVATE_KEY]: "alipay_private_key.txt",
      [CertificateType.ALIPAY_PUBLIC_KEY]: "alipay_public_key.txt",
    };

    return fileNames[certificateType];
  }

  /**
   * 获取环境变量键名
   */
  private getEnvKey(
    paymentMethod: string,
    certificateType: CertificateType,
  ): string {
    const envKeys: Record<string, string> = {
      wechat_wechat_apiclient_cert: "WECHAT_APICLIENT_CERT",
      wechat_wechat_private_key: "WECHAT_PRIVATE_KEY",
      wechat_wechat_public_key: "WECHAT_PUBLIC_KEY",
      wechat_wechat_api_key: "WECHAT_API_KEY",
      alipay_alipay_private_key: "ALIPAY_PRIVATE_KEY",
      alipay_alipay_public_key: "ALIPAY_PUBLIC_KEY",
    };

    return envKeys[`${paymentMethod}_${certificateType}`] || "";
  }

  /**
   * 检查证书是否存在
   */
  certificateExists(
    paymentMethod: string,
    certificateType: CertificateType,
    environment: "development" | "production" = "development",
  ): boolean {
    try {
      this.getCertificate(paymentMethod, certificateType, environment);
      return true;
    } catch {
      return false;
    }
  }
}
