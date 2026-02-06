import { PaymentConfig } from "@prisma/client";

export interface IPaymentConfigService {
  create(data: CreatePaymentConfigInput): Promise<PaymentConfig>;
  update(id: string, data: UpdatePaymentConfigInput): Promise<PaymentConfig>;
  delete(id: string): Promise<PaymentConfig>;
  findById(id: string): Promise<PaymentConfig | null>;
  findByMethodAndChannel(
    paymentMethod: string,
    paymentChannel: string,
  ): Promise<PaymentConfig | null>;
  findAll(query: QueryPaymentConfigInput): Promise<PaymentConfig[]>;
  getActiveConfig(
    paymentMethod: string,
    paymentChannel: string,
  ): Promise<PaymentConfig | null>;
}

export interface CreatePaymentConfigInput {
  paymentMethod: string;
  paymentChannel: string;
  appId?: string;
  appSecret?: string;
  merchantId?: string;
  apiKey?: string;
  certPath?: string;
  notifyUrl?: string;
  returnUrl?: string;
  sandbox?: boolean;
}

export interface UpdatePaymentConfigInput {
  appSecret?: string;
  apiKey?: string;
  certPath?: string;
  notifyUrl?: string;
  returnUrl?: string;
  sandbox?: boolean;
  status?: number;
}

export interface QueryPaymentConfigInput {
  paymentMethod?: string;
  paymentChannel?: string;
}
