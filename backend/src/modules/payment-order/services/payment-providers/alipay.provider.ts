import { Injectable, Optional } from "@nestjs/common";
import { BasePaymentProvider } from "./base-provider";
import {
  QrCodeParams,
  QrCodeResult,
  CallbackResult,
  OrderStatus,
  RefundResult,
} from "../../interfaces/payment-provider.interface";
import { QrCodeUtil } from "@/lib/qr-code.util";
import { CertificateService } from "../certificate.service";
import { CertificateType } from "../../dto/certificate.dto";
import * as crypto from "crypto";

/**
 * 支付宝支付提供者
 * 实现 v2 API
 */
@Injectable()
export class AlipayProvider extends BasePaymentProvider {
  private readonly gatewayUrl = "https://openapi.alipay.com/gateway.do";

  constructor(@Optional() private certificateService: CertificateService) {
    super("AlipayProvider");
  }

  /**
   * 生成支付二维码
   */
  async generateQrCode(params: QrCodeParams): Promise<QrCodeResult> {
    try {
      this.logger.log(`生成支付宝支付二维码: ${params.orderNo}`);

      // 构建请求参数
      const bizContent = {
        out_trade_no: params.orderNo,
        total_amount: params.amount.toFixed(2),
        subject: params.description || "支付订单",
      };

      if (params.notifyUrl) {
        bizContent["notify_url"] = params.notifyUrl;
      }

      if (params.timeExpire) {
        const timeoutExpress = Math.ceil(
          (params.timeExpire.getTime() - Date.now()) / (1000 * 60),
        );
        bizContent["timeout_express"] = `${timeoutExpress}m`;
      }

      // 构建完整请求参数
      const requestData = {
        app_id: process.env.ALIPAY_APP_ID || "",
        method: "alipay.trade.precreate",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.getTimestamp(),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      // 生成签名
      const sign = this.generateSign(requestData);
      requestData["sign"] = sign;

      // 发送请求
      const response = await this.httpPost(
        this.gatewayUrl,
        this.buildQuery(requestData),
      );

      const result = JSON.parse(response.alipay_trade_precreate_response);

      if (result.code !== "10000") {
        throw new Error(`支付宝错误: ${result.sub_msg || result.msg}`);
      }

      // 生成二维码
      const qrCodeData = result.qr_code;
      const qrCodeUrl = await QrCodeUtil.generateDataUrl(qrCodeData);

      return {
        qrCodeUrl,
        qrCodeData,
        expiresAt:
          params.timeExpire || new Date(Date.now() + 2 * 60 * 60 * 1000),
      };
    } catch (error) {
      this.logger.error(`生成支付宝支付二维码失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理支付回调
   */
  async handleCallback(data: any): Promise<CallbackResult> {
    try {
      this.logger.log(`处理支付宝支付回调: ${JSON.stringify(data)}`);

      // 验证签名
      if (!this.verifySignature(data, data.sign)) {
        throw new Error("签名验证失败");
      }

      const tradeStatus = data.trade_status;

      if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
        return {
          success: false,
          orderNo: data.out_trade_no,
          transactionId: data.trade_no,
          amount: parseFloat(data.total_amount),
          error: `交易状态: ${tradeStatus}`,
        };
      }

      return {
        success: true,
        orderNo: data.out_trade_no,
        transactionId: data.trade_no,
        amount: parseFloat(data.total_amount),
        paidAt: new Date(data.gmt_payment || Date.now()),
      };
    } catch (error) {
      this.logger.error(`处理支付宝支付回调失败: ${error.message}`);
      return {
        success: false,
        orderNo: "",
        amount: 0,
        error: error.message,
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(orderNo: string): Promise<OrderStatus> {
    try {
      this.logger.log(`查询支付宝支付订单: ${orderNo}`);

      const bizContent = {
        out_trade_no: orderNo,
      };

      const requestData = {
        app_id: process.env.ALIPAY_APP_ID || "",
        method: "alipay.trade.query",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.getTimestamp(),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      const sign = this.generateSign(requestData);
      requestData["sign"] = sign;

      const response = await this.httpPost(
        this.gatewayUrl,
        this.buildQuery(requestData),
      );
      const result = JSON.parse(response.alipay_trade_query_response);

      return {
        orderNo: result.out_trade_no,
        status: this.mapStatus(result.trade_status),
        paidAt: result.send_pay_date
          ? new Date(result.send_pay_date)
          : undefined,
        transactionId: result.trade_no,
        amount: parseFloat(result.total_amount),
      };
    } catch (error) {
      this.logger.error(`查询支付宝支付订单失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 退款
   */
  async refund(
    orderNo: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    try {
      this.logger.log(`支付宝退款: ${orderNo}, 金额: ${amount}`);

      const bizContent = {
        out_trade_no: orderNo,
        refund_amount: amount.toFixed(2),
        refund_reason: reason || "用户退款",
        out_request_no: `${orderNo}_refund_${Date.now()}`,
      };

      const requestData = {
        app_id: process.env.ALIPAY_APP_ID || "",
        method: "alipay.trade.refund",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.getTimestamp(),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      const sign = this.generateSign(requestData);
      requestData["sign"] = sign;

      const response = await this.httpPost(
        this.gatewayUrl,
        this.buildQuery(requestData),
      );
      const result = JSON.parse(response.alipay_trade_refund_response);

      if (result.code !== "10000") {
        return {
          success: false,
          refundId: result.out_request_no,
          amount: 0,
          error: result.sub_msg || result.msg || "退款失败",
        };
      }

      return {
        success: true,
        refundId: result.out_request_no,
        amount: parseFloat(result.refund_fee),
      };
    } catch (error) {
      this.logger.error(`支付宝退款失败: ${error.message}`);
      return {
        success: false,
        refundId: "",
        amount: 0,
        error: error.message,
      };
    }
  }

  /**
   * 验证签名
   */
  verifySignature(data: any, signature: string): boolean {
    try {
      // 移除sign参数
      const params = { ...data };
      delete params.sign;
      delete params.sign_type;

      // 排序并构建待签名字符串
      const sortedParams = Object.keys(params).sort();
      const signContent = sortedParams
        .map((key) => `${key}=${params[key]}`)
        .join("&");

      const publicKey = this.getAlipayPublicKey();

      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(signContent, "utf8");

      return verify.verify(publicKey, signature, "base64");
    } catch (error) {
      this.logger.error(`验证签名失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderNo: string): Promise<boolean> {
    try {
      const bizContent = {
        out_trade_no: orderNo,
      };

      const requestData = {
        app_id: process.env.ALIPAY_APP_ID || "",
        method: "alipay.trade.close",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.getTimestamp(),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      const sign = this.generateSign(requestData);
      requestData["sign"] = sign;

      await this.httpPost(this.gatewayUrl, this.buildQuery(requestData));
      return true;
    } catch (error) {
      this.logger.error(`关闭支付宝订单失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 生成签名
   */
  private generateSign(params: Record<string, any>): string {
    // 移除空值和sign参数
    const filteredParams = Object.keys(params)
      .filter(
        (key) =>
          params[key] !== "" &&
          params[key] !== null &&
          params[key] !== undefined &&
          key !== "sign",
      )
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, any>,
      );

    // 构建待签名字符串
    const signContent = Object.keys(filteredParams)
      .map((key) => `${key}=${filteredParams[key]}`)
      .join("&");

    const privateKey = this.getPrivateKey();

    const sign = crypto.sign(
      "RSA-SHA256",
      Buffer.from(signContent, "utf-8"),
      privateKey,
    );
    return sign.toString("base64");
  }

  /**
   * 构建查询字符串
   */
  private buildQuery(params: Record<string, any>): string {
    return Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
  }

  /**
   * 获取私钥
   */
  private getPrivateKey(): string {
    try {
      // 优先从证书服务读取
      if (this.certificateService) {
        if (
          this.certificateService.certificateExists(
            "alipay",
            CertificateType.ALIPAY_PRIVATE_KEY,
          )
        ) {
          return this.certificateService.getCertificate(
            "alipay",
            CertificateType.ALIPAY_PRIVATE_KEY,
          );
        }
      }

      // 从环境变量读取(降级策略)
      return process.env.ALIPAY_PRIVATE_KEY || "";
    } catch (error) {
      this.logger.error("获取支付宝私钥失败");
      return "";
    }
  }

  /**
   * 获取支付宝公钥
   */
  private getAlipayPublicKey(): string {
    try {
      // 优先从证书服务读取
      if (this.certificateService) {
        if (
          this.certificateService.certificateExists(
            "alipay",
            CertificateType.ALIPAY_PUBLIC_KEY,
          )
        ) {
          return this.certificateService.getCertificate(
            "alipay",
            CertificateType.ALIPAY_PUBLIC_KEY,
          );
        }
      }

      // 从环境变量读取(降级策略)
      return process.env.ALIPAY_PUBLIC_KEY || "";
    } catch (error) {
      this.logger.error("获取支付宝公钥失败");
      return "";
    }
  }

  /**
   * 获取时间戳
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 映射订单状态
   */
  private mapStatus(
    tradeStatus: string,
  ): "pending" | "paid" | "cancelled" | "refunded" | "expired" {
    const statusMap: Record<string, any> = {
      WAIT_BUYER_PAY: "pending",
      TRADE_SUCCESS: "paid",
      TRADE_FINISHED: "paid",
      TRADE_CLOSED: "cancelled",
    };

    return statusMap[tradeStatus] || "pending";
  }
}
