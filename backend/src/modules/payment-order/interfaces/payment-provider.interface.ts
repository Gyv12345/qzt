export interface IPaymentProvider {
  /**
   * 生成支付二维码
   */
  generateQrCode(params: QrCodeParams): Promise<QrCodeResult>;

  /**
   * 处理支付回调
   */
  handleCallback(data: any): Promise<CallbackResult>;

  /**
   * 查询订单状态
   */
  queryOrder(orderNo: string): Promise<OrderStatus>;

  /**
   * 退款
   */
  refund(orderNo: string, amount: number, reason?: string): Promise<RefundResult>;

  /**
   * 验证回调签名
   */
  verifySignature(data: any, signature: string): boolean;

  /**
   * 关闭订单
   */
  closeOrder(orderNo: string): Promise<boolean>;
}

export interface QrCodeParams {
  orderNo: string;
  amount: number;
  description?: string;
  notifyUrl?: string;
  returnUrl?: string;
  clientIp?: string;
  timeExpire?: Date;
}

export interface QrCodeResult {
  qrCodeUrl: string;
  qrCodeData: string;
  prepayId?: string;
  expiresAt: Date;
}

export interface CallbackResult {
  success: boolean;
  orderNo: string;
  transactionId?: string;
  amount: number;
  paidAt?: Date;
  error?: string;
}

export interface OrderStatus {
  orderNo: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
  paidAt?: Date;
  transactionId?: string;
  amount: number;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  error?: string;
}
