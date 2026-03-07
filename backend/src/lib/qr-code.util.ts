import * as QRCode from "qrcode";

/**
 * 二维码工具类
 * 使用 qrcode 库生成二维码
 */
export class QrCodeUtil {
  /**
   * 生成二维码数据URL（base64）
   * @param data 二维码内容
   * @param options 生成选项
   * @returns base64 格式的图片数据
   */
  static async generateDataUrl(
    data: string,
    options?: QRCode.QRCodeToDataURLOptions,
  ): Promise<string> {
    try {
      const defaultOptions: QRCode.QRCodeToDataURLOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        ...options,
      };

      return await QRCode.toDataURL(data, defaultOptions);
    } catch (error) {
      throw new Error(`生成二维码失败: ${error.message}`);
    }
  }

  /**
   * 生成二维码 Buffer
   * @param data 二维码内容
   * @param options 生成选项
   * @returns PNG 格式的 Buffer
   */
  static async generateBuffer(
    data: string,
    options?: QRCode.QRCodeToBufferOptions,
  ): Promise<Buffer> {
    try {
      const defaultOptions: QRCode.QRCodeToBufferOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        ...options,
      };

      return await QRCode.toBuffer(data, defaultOptions);
    } catch (error) {
      throw new Error(`生成二维码失败: ${error.message}`);
    }
  }

  /**
   * 生成二维码 SVG
   * @param data 二维码内容
   * @param options 生成选项
   * @returns SVG 字符串
   */
  static async generateSvg(
    data: string,
    options?: QRCode.QRCodeToDataURLOptions,
  ): Promise<string> {
    try {
      return await QRCode.toString(data, { type: "svg" });
    } catch (error) {
      throw new Error(`生成二维码失败: ${error.message}`);
    }
  }

  /**
   * 生成二维码并保存为文件
   * @param data 二维码内容
   * @param filePath 文件路径
   * @param options 生成选项
   */
  static async generateToFile(
    data: string,
    filePath: string,
    options?: QRCode.QRCodeToFileOptions,
  ): Promise<void> {
    try {
      const defaultOptions: QRCode.QRCodeToFileOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        ...options,
      };

      await QRCode.toFile(filePath, data, defaultOptions);
    } catch (error) {
      throw new Error(`生成二维码文件失败: ${error.message}`);
    }
  }

  /**
   * 生成支付二维码
   * @param paymentUrl 支付链接
   * @param amount 金额
   * @returns base64 格式的二维码图片
   */
  static async generatePaymentQrCode(
    paymentUrl: string,
    amount?: number,
  ): Promise<string> {
    const data = amount ? `${paymentUrl}?amount=${amount}` : paymentUrl;

    return await this.generateDataUrl(data, {
      width: 400,
      margin: 3,
    });
  }
}
