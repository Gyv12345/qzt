import { PaymentOrder } from '@prisma/client';

export interface IPaymentOrderService {
  create(data: CreatePaymentOrderInput): Promise<PaymentOrder>;
  update(id: string, data: UpdatePaymentOrderInput): Promise<PaymentOrder>;
  delete(id: string): Promise<PaymentOrder>;
  findById(id: string): Promise<PaymentOrder | null>;
  findByOrderNo(orderNo: string): Promise<PaymentOrder | null>;
  findAll(query: QueryPaymentOrderInput): Promise<{ data: PaymentOrder[]; total: number }>;
  generateQrCode(orderId: string, clientIp?: string): Promise<QrCodeResult>;
  handleCallback(paymentMethod: string, data: any): Promise<CallbackResult>;
  refund(orderId: string, amount: number, reason?: string): Promise<PaymentOrder>;
  cancelOrder(id: string): Promise<PaymentOrder>;
  checkOrderStatus(orderNo: string): Promise<OrderStatusResult>;
}

export interface CreatePaymentOrderInput {
  contractId?: string;
  amount: number;
  paymentMethod: string;
  paymentChannel?: string;
  clientIp?: string;
  returnUrl?: string;
  notifyUrl?: string;
  body?: string;
  attach?: string;
}

export interface UpdatePaymentOrderInput {
  status?: string;
  transactionId?: string;
  paidAt?: Date;
}

export interface QueryPaymentOrderInput {
  contractId?: string;
  orderNo?: string;
  paymentMethod?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface QrCodeResult {
  qrCodeUrl: string;
  qrCodeData: string;
  expiresAt: Date;
}

export interface CallbackResult {
  success: boolean;
  orderNo: string;
  transactionId?: string;
  amount: number;
  error?: string;
}

export interface OrderStatusResult {
  orderNo: string;
  status: string;
  paidAt?: Date;
  transactionId?: string;
}
