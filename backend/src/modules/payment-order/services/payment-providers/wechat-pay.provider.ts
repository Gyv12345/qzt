import { Injectable } from '@nestjs/common';
import { BasePaymentProvider } from './base-provider';
import { QrCodeParams, QrCodeResult, CallbackResult, OrderStatus, RefundResult } from '../../interfaces/payment-provider.interface';
import { QrCodeUtil } from '@/lib/qr-code.util';
import * as crypto from 'crypto';

/**
 * 微信支付提供者
 * 实现 v3 API
 */
@Injectable()
export class WechatPayProvider extends BasePaymentProvider {
  private readonly baseUrl = 'https://api.mch.weixin.qq.com';
  private readonly apiV3 = '/v3';

  constructor() {
    super('WechatPayProvider');
  }

  /**
   * 生成支付二维码
   */
  async generateQrCode(params: QrCodeParams): Promise<QrCodeResult> {
    try {
      this.logger.log(`生成微信支付二维码: ${params.orderNo}`);

      // 构建请求参数
      const requestData = {
        appid: process.env.WECHAT_APP_ID || '',
        mchid: process.env.WECHAT_MCH_ID || '',
        description: params.description || '支付订单',
        out_trade_no: params.orderNo,
        notify_url: params.notifyUrl,
        amount: {
          total: Math.round(params.amount * 100), // 转换为分
          currency: 'CNY',
        },
        scene_info: {
          payer_client_ip: params.clientIp || '127.0.0.1',
        },
      };

      // 添加过期时间
      if (params.timeExpire) {
        requestData['time_expire'] = params.timeExpire.toISOString();
      }

      // 发送请求
      const response = await this.httpPost(
        `${this.baseUrl}${this.apiV3}/pay/transactions/native`,
        requestData,
        await this.getHeaders(),
      );

      if (response.status !== '200') {
        throw new Error(`微信支付错误: ${response.message}`);
      }

      // 生成二维码
      const qrCodeData = response.code_url;
      const qrCodeUrl = await QrCodeUtil.generateDataUrl(qrCodeData);

      return {
        qrCodeUrl,
        qrCodeData,
        prepayId: response.prepay_id,
        expiresAt: params.timeExpire || new Date(Date.now() + 2 * 60 * 60 * 1000),
      };
    } catch (error) {
      this.logger.error(`生成微信支付二维码失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理支付回调
   */
  async handleCallback(data: any): Promise<CallbackResult> {
    try {
      this.logger.log(`处理微信支付回调: ${JSON.stringify(data)}`);

      // 验证签名
      const signature = data.headers?.['wechatpay-signature'] || data.headers?.['Wechatpay-Signature'];
      const timestamp = data.headers?.['wechatpay-timestamp'] || data.headers?.['Wechatpay-Timestamp'];
      const nonce = data.headers?.['wechatpay-nonce'] || data.headers?.['Wechatpay-Nonce'];
      const body = data.body;

      if (!signature || !this.verifySignature({ timestamp, nonce, body }, signature)) {
        throw new Error('签名验证失败');
      }

      // 解密回调数据
      const callbackData = JSON.parse(body);
      const resource = callbackData.resource;
      const decrypted = this.decryptData(resource.ciphertext, resource.associated_data, resource.nonce);
      const orderData = JSON.parse(decrypted);

      if (orderData.trade_state !== 'SUCCESS') {
        return {
          success: false,
          orderNo: orderData.out_trade_no,
          transactionId: orderData.transaction_id,
          amount: orderData.amount?.total ? orderData.amount.total / 100 : 0,
          error: `交易状态: ${orderData.trade_state}`,
        };
      }

      return {
        success: true,
        orderNo: orderData.out_trade_no,
        transactionId: orderData.transaction_id,
        amount: orderData.amount?.total ? orderData.amount.total / 100 : 0,
        paidAt: new Date(orderData.success_time || Date.now()),
      };
    } catch (error) {
      this.logger.error(`处理微信支付回调失败: ${error.message}`);
      return {
        success: false,
        orderNo: '',
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
      this.logger.log(`查询微信支付订单: ${orderNo}`);

      const response = await this.httpGet(
        `${this.baseUrl}${this.apiV3}/pay/transactions/out-trade-no/${orderNo}`,
        {
          mchid: process.env.WECHAT_MCH_ID || '',
        },
        await this.getHeaders(),
      );

      return {
        orderNo: response.out_trade_no,
        status: this.mapStatus(response.trade_state),
        paidAt: response.success_time ? new Date(response.success_time) : undefined,
        transactionId: response.transaction_id,
        amount: response.amount?.total ? response.amount.total / 100 : 0,
      };
    } catch (error) {
      this.logger.error(`查询微信支付订单失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 退款
   */
  async refund(orderNo: string, amount: number, reason?: string): Promise<RefundResult> {
    try {
      this.logger.log(`微信支付退款: ${orderNo}, 金额: ${amount}`);

      const requestData = {
        out_trade_no: orderNo,
        out_refund_no: `${orderNo}_refund_${Date.now()}`,
        reason: reason || '用户退款',
        amount: {
          refund: Math.round(amount * 100),
          total: Math.round(amount * 100),
          currency: 'CNY',
        },
        notify_url: process.env.WECHAT_REFUND_NOTIFY_URL,
      };

      const response = await this.httpPost(
        `${this.baseUrl}${this.apiV3}/refund/domestic/refunds`,
        requestData,
        await this.getHeaders(),
      );

      if (response.status !== 'SUCCESS') {
        return {
          success: false,
          refundId: response.refund_id,
          amount: 0,
          error: response.message || '退款失败',
        };
      }

      return {
        success: true,
        refundId: response.refund_id,
        amount: response.amount?.refund ? response.amount.refund / 100 : 0,
      };
    } catch (error) {
      this.logger.error(`微信支付退款失败: ${error.message}`);
      return {
        success: false,
        refundId: '',
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
      const message = `${data.timestamp}\n${data.nonce}\n${data.body}\n`;
      const publicKey = this.getPublicKey();

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(message);
      verify.end();

      return verify.verify(publicKey, signature, 'base64');
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
      await this.httpPost(
        `${this.baseUrl}${this.apiV3}/pay/transactions/out-trade-no/${orderNo}/close`,
        {},
        await this.getHeaders(),
      );
      return true;
    } catch (error) {
      this.logger.error(`关闭微信支付订单失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取请求头
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const body = '';

    const signature = this.generateSignature(timestamp, nonce, body);
    const serialNo = process.env.WECHAT_CERT_SERIAL_NO || '';

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${process.env.WECHAT_MCH_ID}",serial_no="${serialNo}",timestamp="${timestamp}",nonce_str="${nonce}",signature="${signature}"`,
    };
  }

  /**
   * 生成签名
   */
  private generateSignature(timestamp: number, nonce: string, body: string): string {
    const message = `POST\n${timestamp}\n${nonce}\n${body}\n`;
    const privateKey = this.getPrivateKey();

    const sign = crypto.sign('RSA-SHA256', Buffer.from(message, 'utf-8'), privateKey);
    return sign.toString('base64');
  }

  /**
   * 获取私钥
   */
  private getPrivateKey(): string {
    // 这里应该从配置或文件中读取私钥
    // TODO: 实现具体的私钥获取逻辑
    return process.env.WECHAT_PRIVATE_KEY || '';
  }

  /**
   * 获取公钥
   */
  private getPublicKey(): string {
    // 这里应该从配置或文件中读取公钥
    // TODO: 实现具体的公钥获取逻辑
    return process.env.WECHAT_PUBLIC_KEY || '';
  }

  /**
   * 解密数据
   */
  private decryptData(ciphertext: string, associatedData: string, nonce: string): string {
    const key = this.getApiKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(Buffer.from(ciphertext.slice(ciphertext.length - 32), 'base64'));

    let decrypted = decipher.update(ciphertext.slice(0, ciphertext.length - 32), 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 获取API密钥
   */
  private getApiKey(): Buffer {
    const apiKey = process.env.WECHAT_API_KEY || '';
    return Buffer.from(apiKey, 'utf8').slice(0, 32);
  }

  /**
   * 映射订单状态
   */
  private mapStatus(tradeState: string): 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired' {
    const statusMap: Record<string, any> = {
      'NOTPAY': 'pending',
      'USERPAYING': 'pending',
      'SUCCESS': 'paid',
      'REFUND': 'refunded',
      'CLOSED': 'cancelled',
      'REVOKED': 'cancelled',
      'PAYERROR': 'expired',
    };

    return statusMap[tradeState] || 'pending';
  }
}
