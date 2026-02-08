import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InitiateSigningDto } from "./dto/initiate-signing.dto";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";

/**
 * e签宝API响应类型
 */
interface EsignResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 签署流程信息
 */
export interface FlowInfo {
  flowId: string;
  status?: string;
  signUrl?: string;
}

/**
 * TODO(human) - 实现签名生成算法
 *
 * e签宝 API 要求请求必须包含签名验证，确保请求的合法性和完整性。
 *
 * 你的任务：在下面的 generateSignature 方法中实现签名算法。
 *
 * 参考说明：
 * 1. e签宝使用摘要签名算法，将请求参数按特定规则排序后拼接
 * 2. 使用 AppSecret 作为密钥进行 HMAC-SHA256 签名
 * 3. 签名结果进行 Base64 编码
 * 4. 详细的签名规则请参考：https://open.esign.cn/doc/opendoc/pdf-sign3/rf4n0s
 *
 * 参数说明：
 * - method: HTTP 请求方法 (GET, POST 等)
 * - url: 请求 URL（不含域名）
 * - params: 查询参数对象
 * - body: 请求体对象
 * - timestamp: 请求时间戳
 * - appSecret: 应用密钥
 *
 * 返回：Base64 编码的签名字符串
 */
@Injectable()
export class EsignService {
  private readonly logger = new Logger(EsignService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>("ESIGN_APP_ID") || "";
    this.appSecret = this.configService.get<string>("ESIGN_APP_SECRET") || "";
    this.apiBaseUrl =
      this.configService.get<string>("ESIGN_API_URL") ||
      "https://openapi.esign.cn";

    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 请求拦截器：添加签名
    this.axiosInstance.interceptors.request.use((config) => {
      const timestamp = Date.now();
      const signature = this.generateSignature(
        config.method?.toUpperCase() || "GET",
        config.url || "",
        config.params,
        config.data,
        timestamp,
      );

      config.headers["X-Tsign-Open-App-Id"] = this.appId;
      config.headers["X-Tsign-Open-Timestamp"] = timestamp.toString();
      config.headers["X-Tsign-Open-Signature"] = signature;
      config.headers["X-Tsign-Open-Auth-Mode"] = "Sig";

      return config;
    });
  }

  /**
   * 生成请求签名
   * TODO(human): 请实现此方法
   */
  private generateSignature(
    method: string,
    url: string,
    params?: Record<string, unknown>,
    body?: unknown,
    timestamp?: number,
  ): string {
    // 开发环境返回模拟签名，生产环境需要实现真实的签名算法
    if (this.configService.get("NODE_ENV") === "development") {
      this.logger.warn("使用开发环境模拟签名，生产环境必须实现真实签名算法");
      return "mock_signature_for_development";
    }

    // TODO(human): 实现真实的签名生成算法
    // 参考文档：https://open.esign.cn/doc/opendoc/pdf-sign3/rf4n0s
    //
    // 步骤提示：
    // 1. 构建待签名文本：method + url + sorted(params) + body + timestamp
    // 2. 使用 HMAC-SHA256 和 appSecret 生成签名
    // 3. 将签名结果进行 Base64 编码
    //
    // const content = this.buildContentToSign(method, url, params, body, timestamp);
    // const hmac = crypto.createHmac('sha256', this.appSecret);
    // hmac.update(content);
    // return Buffer.from(hmac.digest()).toString('base64');

    return "";
  }

  /**
   * 创建签署流程
   */
  async createFlow(
    subject: string,
    description?: string,
  ): Promise<EsignResponse<{ flowId: string }>> {
    try {
      const response = await this.axiosInstance.post<
        EsignResponse<{ flowId: string }>
      >("/v3/sign-flow/create-by-file", {
        subject,
        description,
      });

      return response.data;
    } catch (error) {
      this.logger.error("创建签署流程失败", error);
      throw new BadRequestException("创建签署流程失败");
    }
  }

  /**
   * 上传文档
   */
  async uploadFile(
    flowId: string,
    fileContent: Buffer,
    fileName: string,
  ): Promise<EsignResponse<{ fileId: string }>> {
    try {
      const formData = new FormData();
      // 将 Buffer 转换为 Uint8Array 以兼容 Blob
      const uint8Array = new Uint8Array(fileContent);
      formData.append("file", new Blob([uint8Array]), fileName);
      formData.append("flowId", flowId);

      const response = await this.axiosInstance.post<
        EsignResponse<{ fileId: string }>
      >("/v3/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error("上传文档失败", error);
      throw new BadRequestException("上传文档失败");
    }
  }

  /**
   * 添加签署人
   */
  async addSigner(
    flowId: string,
    signerInfo: {
      name: string;
      mobile: string;
      signerType: "ENTERPRISE" | "PERSON";
      organization?: string;
      idCard?: string;
    },
  ): Promise<EsignResponse<{ signerAccountId: string }>> {
    try {
      const response = await this.axiosInstance.post<
        EsignResponse<{ signerAccountId: string }>
      >("/v3/sign-flow/signer/add", {
        flowId,
        signers: [
          {
            psnInfo: {
              psnAccount: signerInfo.mobile,
              psnName: signerInfo.name,
              idCard: signerInfo.idCard,
            },
            orgInfo: signerInfo.organization
              ? {
                  orgName: signerInfo.organization,
                }
              : undefined,
            signerType: signerInfo.signerType,
          },
        ],
      });

      return response.data;
    } catch (error) {
      this.logger.error("添加签署人失败", error);
      throw new BadRequestException("添加签署人失败");
    }
  }

  /**
   * 发起签署
   */
  async startSign(flowId: string): Promise<EsignResponse<FlowInfo>> {
    try {
      const response = await this.axiosInstance.post<EsignResponse<FlowInfo>>(
        "/v3/sign-flow/sign-url/get",
        {
          flowId,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error("发起签署失败", error);
      throw new BadRequestException("发起签署失败");
    }
  }

  /**
   * 查询签署流程状态
   */
  async getFlowStatus(flowId: string): Promise<EsignResponse<FlowInfo>> {
    try {
      const response = await this.axiosInstance.post<EsignResponse<FlowInfo>>(
        "/v3/sign-flow/status-query",
        {
          flowId,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error("查询签署状态失败", error);
      throw new BadRequestException("查询签署状态失败");
    }
  }

  /**
   * 初始化合同签署
   * 完整流程：创建流程 -> 上传文档 -> 添加签署人 -> 发起签署
   */
  async initiateSigning(
    initiateSigningDto: InitiateSigningDto,
    fileContent: Buffer,
    fileName: string,
  ) {
    const { contractId, signers, subject, description, remark } =
      initiateSigningDto;

    // 验证合同是否存在
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true },
    });

    if (!contract) {
      throw new NotFoundException("合同不存在");
    }

    // 检查是否已有签署记录
    const existingRecord = await this.prisma.esignRecord.findUnique({
      where: { contractId },
    });

    if (existingRecord) {
      throw new BadRequestException("该合同已存在签署记录");
    }

    try {
      // 1. 创建签署流程
      const flowResult = await this.createFlow(subject, description);
      if (!flowResult.data?.flowId) {
        throw new BadRequestException("创建签署流程失败");
      }
      const flowId = flowResult.data.flowId;

      // 2. 上传文档
      const uploadResult = await this.uploadFile(flowId, fileContent, fileName);
      if (!uploadResult.data?.fileId) {
        throw new BadRequestException("上传文档失败");
      }

      // 3. 添加签署人
      for (const signer of signers) {
        await this.addSigner(flowId, signer);
      }

      // 4. 发起签署
      const signResult = await this.startSign(flowId);

      // 5. 保存签署记录
      const esignRecord = await this.prisma.esignRecord.create({
        data: {
          contractId,
          flowId,
          status: "SIGNING",
          signUrl: signResult.data?.signUrl,
          remark,
        },
      });

      return {
        success: true,
        flowId: esignRecord.flowId,
        signUrl: esignRecord.signUrl,
        record: esignRecord,
      };
    } catch (error) {
      this.logger.error("发起签署失败", error);
      throw error;
    }
  }

  /**
   * 查询签署状态
   */
  async getSigningStatus(contractId: string) {
    const record = await this.prisma.esignRecord.findUnique({
      where: { contractId },
      include: { contract: true },
    });

    if (!record) {
      throw new NotFoundException("签署记录不存在");
    }

    // 从 e签宝查询最新状态
    const statusResult = await this.getFlowStatus(record.flowId);

    // 更新本地状态
    if (statusResult.data?.status) {
      const statusMap: Record<string, string> = {
        DRAFT: "DRAFT",
        SIGNING: "SIGNING",
        COMPLETED: "COMPLETED",
        FAILED: "FAILED",
        CANCELLED: "CANCELLED",
      };

      const newStatus = statusMap[statusResult.data.status] || record.status;
      const updateData: {
        status?: string;
        signedAt?: Date;
      } = { status: newStatus };

      if (newStatus === "COMPLETED" && !record.signedAt) {
        updateData.signedAt = new Date();
      }

      await this.prisma.esignRecord.update({
        where: { id: record.id },
        data: updateData,
      });
    }

    return {
      record,
      remoteStatus: statusResult.data,
    };
  }

  /**
   * 获取签署记录
   */
  async getRecord(contractId: string) {
    const record = await this.prisma.esignRecord.findUnique({
      where: { contractId },
      include: { contract: { include: { customer: true } } },
    });

    if (!record) {
      throw new NotFoundException("签署记录不存在");
    }

    return record;
  }

  /**
   * 处理 e签宝回调通知
   */
  async handleCallback(callbackData: {
    flowId: string;
    status: string;
    timestamp: number;
  }) {
    const { flowId, status } = callbackData;

    const record = await this.prisma.esignRecord.findFirst({
      where: { flowId },
    });

    if (!record) {
      this.logger.warn(`收到未知流程的回调: ${flowId}`);
      return { success: false, message: "流程不存在" };
    }

    const statusMap: Record<string, string> = {
      DRAFT: "DRAFT",
      SIGNING: "SIGNING",
      COMPLETED: "COMPLETED",
      FAILED: "FAILED",
      CANCELLED: "CANCELLED",
    };

    const newStatus = statusMap[status] || record.status;
    const updateData: {
      status?: string;
      signedAt?: Date;
    } = { status: newStatus };

    if (newStatus === "COMPLETED" && !record.signedAt) {
      updateData.signedAt = new Date();
    }

    await this.prisma.esignRecord.update({
      where: { id: record.id },
      data: updateData,
    });

    this.logger.log(
      `签署流程 ${flowId} 状态更新为 ${newStatus}, 合同ID: ${record.contractId}`,
    );

    return { success: true };
  }

  /**
   * 获取所有签署记录
   */
  async findAll(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, page = 1, pageSize = 10 } = params || {};

    const where = status ? { status } : {};

    const [total, items] = await Promise.all([
      this.prisma.esignRecord.count({ where }),
      this.prisma.esignRecord.findMany({
        where,
        include: {
          contract: {
            include: {
              customer: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      data: items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
