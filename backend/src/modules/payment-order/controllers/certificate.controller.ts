import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CertificateService } from "../services/certificate.service";
import {
  CertificateConfigDto,
  VerifyCertificateDto,
} from "../dto/certificate.dto";

/**
 * 证书管理控制器
 * 提供证书的保存、验证、列表等API
 */
@ApiTags("payment-certificates")
@Controller("payment-certificates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificateController {
  constructor(private certificateService: CertificateService) {}

  @Post("save")
  @ApiOperation({ summary: "保存证书文件" })
  async saveCertificate(@Body() dto: CertificateConfigDto) {
    if (!dto.certContent) {
      return {
        success: false,
        error: "Certificate content is required",
      };
    }

    return this.certificateService.saveCertificate(
      dto.paymentMethod,
      dto.certificateType,
      dto.certContent,
      dto.environment,
    );
  }

  @Post("verify")
  @ApiOperation({ summary: "验证证书配置" })
  async verifyCertificates(@Body() dto: VerifyCertificateDto) {
    return this.certificateService.verifyCertificates(
      dto.paymentMethod,
      dto.environment,
    );
  }

  @Get("list")
  @ApiOperation({ summary: "列出所有证书文件" })
  async listCertificates() {
    const fs = require("fs");
    const path = require("path");

    const certBasePath = process.env.CERT_BASE_PATH || "/opt/qzt/certificates";
    const certificates: any[] = [];

    try {
      const methods = ["wechat", "alipay"];
      const environments = ["development", "production"];

      for (const method of methods) {
        for (const env of environments) {
          const certDir = path.join(certBasePath, method, env);

          if (fs.existsSync(certDir)) {
            const files = fs.readdirSync(certDir);

            for (const file of files) {
              const filePath = path.join(certDir, file);
              const stats = fs.statSync(filePath);

              certificates.push({
                paymentMethod: method,
                environment: env,
                filename: file,
                size: stats.size,
                modified: stats.mtime,
                exists: true,
              });
            }
          }
        }
      }

      return { certificates };
    } catch (error: any) {
      return {
        certificates: [],
        error: error.message,
      };
    }
  }
}
