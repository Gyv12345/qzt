import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as OSS from "ali-oss";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UploadFileDto } from "./dto/upload-file.dto";
import { ossConfig, validateOSSConfig } from "../../config/modules/oss.config";

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private readonly config: ReturnType<typeof ossConfig>;
  private ossClient?: OSS;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // 使用统一的配置工厂获取 OSS 配置
    this.config = ossConfig(configService);

    // 验证配置
    const validation = validateOSSConfig(this.config);
    if (!validation.valid) {
      this.logger.warn(`OSS 配置不完整: ${validation.error}`);
      return;
    }

    if (!this.config.enabled) {
      this.logger.warn("OSS 未启用，文件上传功能将不可用");
      return;
    }

    // 初始化 OSS 客户端
    try {
      this.ossClient = new OSS({
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        bucket: this.config.bucket,
      });
      this.logger.log(
        `OSS 客户端初始化成功 (region: ${this.config.region}, bucket: ${this.config.bucket})`,
      );
    } catch (error: any) {
      this.logger.error(`OSS 客户端初始化失败: ${error.message}`);
    }
  }

  /**
   * 检查 OSS 是否可用
   */
  private ensureOssAvailable() {
    if (!this.ossClient) {
      throw new BadRequestException("OSS 服务未配置或未启用，无法上传文件");
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(uploadFileDto: UploadFileDto, uploaderId?: string) {
    this.ensureOssAvailable();
    const {
      fileName,
      fileContent,
      fileType = "other",
      mimeType,
    } = uploadFileDto;

    if (!this.ossClient) {
      throw new BadRequestException("OSS 服务未配置，无法上传文件");
    }

    try {
      // 将 Base64 转换为 Buffer
      const buffer = Buffer.from(fileContent, "base64");

      // 生成唯一文件名（带前缀）
      const uniqueFileName = this.generateUniqueFileName(fileName);

      // 上传到 OSS
      const result = await this.ossClient.put(uniqueFileName, buffer, {
        headers: mimeType ? { "Content-Type": mimeType } : undefined,
      });

      // 获取文件信息
      const fileSize = buffer.length;

      // 检测文件类型
      const detectedFileType = this.detectFileType(fileName, fileType);

      // 保存文件记录
      const ossFile = await this.prisma.ossFile.create({
        data: {
          fileName,
          fileUrl: result.url,
          fileSize,
          fileType: detectedFileType,
          mimeType: mimeType || this.getMimeType(fileName),
          uploaderId,
        },
      });

      return ossFile;
    } catch (error: any) {
      this.logger.error(`OSS 上传失败: ${error.message}`, error.stack);
      throw new BadRequestException(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 获取上传授权 URL（前端直传）
   */
  async getUploadUrl(fileName: string, mimeType?: string) {
    try {
      // 生成唯一文件名
      const uniqueFileName = this.generateUniqueFileName(fileName);

      // 生成签名 URL
      const url = this.ossClient.signatureUrl(uniqueFileName, {
        method: "PUT",
        "Content-Type": mimeType,
        expires: 3600, // 1 小时有效期
      });

      return {
        uploadUrl: url,
        fileName: uniqueFileName,
        expiresIn: 3600,
      };
    } catch (error: any) {
      this.logger.error(`生成上传 URL 失败: ${error.message}`, error.stack);
      throw new BadRequestException(`生成上传 URL 失败: ${error.message}`);
    }
  }

  /**
   * 分页查询文件列表
   */
  async findFiles(page: number = 1, pageSize: number = 10, fileType?: string) {
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (fileType) {
      where.fileType = fileType;
    }

    const total = await this.prisma.ossFile.count({ where });

    const data = await this.prisma.ossFile.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        fileType: true,
        mimeType: true,
        createdAt: true,
        uploaderId: true,
      },
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取文件详情
   */
  async findOne(id: string) {
    const file = await this.prisma.ossFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException("文件不存在");
    }

    return file;
  }

  /**
   * 代理下载文件（避免直接暴露 OSS URL）
   */
  async downloadFile(id: string) {
    const file = await this.prisma.ossFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException("文件不存在");
    }

    if (!this.ossClient) {
      throw new BadRequestException("OSS 服务未配置");
    }

    try {
      // 从 OSS 获取文件流
      const result = await this.ossClient.get(
        decodeURIComponent(file.fileName),
      );

      return {
        stream: result.content,
        filename: file.fileName,
        mimeType: file.mimeType,
      };
    } catch (error: any) {
      this.logger.error(`OSS 下载失败: ${error.message}`, error.stack);
      throw new BadRequestException(`文件下载失败: ${error.message}`);
    }
  }

  /**
   * 删除文件
   */
  async remove(id: string) {
    const file = await this.prisma.ossFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException("文件不存在");
    }

    try {
      // 从 URL 中提取文件名
      const url = new URL(file.fileUrl);
      const fileName = decodeURIComponent(url.pathname.substring(1));

      // 从 OSS 删除
      await this.ossClient.delete(fileName);

      // 删除数据库记录
      await this.prisma.ossFile.delete({
        where: { id },
      });

      return { message: "删除成功" };
    } catch (error: any) {
      this.logger.error(`OSS 删除失败: ${error.message}`, error.stack);
      throw new BadRequestException(`文件删除失败: ${error.message}`);
    }
  }

  /**
   * 获取存储空间使用统计
   */
  async getUsage() {
    const totalFiles = await this.prisma.ossFile.count();

    const usage = await this.prisma.ossFile.aggregate({
      _sum: {
        fileSize: true,
      },
    });

    const totalSize = usage._sum.fileSize || 0;

    // 按类型统计
    const byType = await this.prisma.ossFile.groupBy({
      by: ["fileType"],
      _count: {
        id: true,
      },
      _sum: {
        fileSize: true,
      },
    });

    return {
      totalFiles,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      byType: byType.map((item) => ({
        type: item.fileType,
        count: item._count.id,
        size: item._sum.fileSize || 0,
        sizeMB: ((item._sum.fileSize || 0) / 1024 / 1024).toFixed(2),
      })),
    };
  }

  /**
   * 生成唯一文件名
   */
  private generateUniqueFileName(originalName: string): string {
    const ext = originalName.includes(".")
      ? "." + originalName.split(".").pop()
      : "";
    const baseName = originalName.replace(ext, "");
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    // 添加配置的文件前缀
    const prefix = this.config.prefix || "";
    return `${prefix}${baseName}_${timestamp}_${random}${ext}`;
  }

  /**
   * 检测文件类型
   */
  private detectFileType(fileName: string, fallbackType: string): string {
    const ext = fileName.toLowerCase().split(".").pop();
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
    const documentExts = [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
    ];
    const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "mkv"];

    if (imageExts.includes(ext || "")) return "image";
    if (documentExts.includes(ext || "")) return "document";
    if (videoExts.includes(ext || "")) return "video";

    return fallbackType;
  }

  /**
   * 获取 MIME 类型
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split(".").pop();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    return mimeTypes[ext || ""] || "application/octet-stream";
  }
}
