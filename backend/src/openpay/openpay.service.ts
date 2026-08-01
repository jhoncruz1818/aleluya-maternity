/**
 * Cliente Openpay Perú (SDK oficial `openpay`).
 * Sandbox: OPENPAY_PRODUCTION !== 'true'
 *
 * El paquete npm apunta a .mx por defecto; forzamos hosts .pe.
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Openpay = require('openpay');

Openpay.BASE_URL = 'https://api.openpay.pe';
Openpay.SANDBOX_URL = 'https://sandbox-api.openpay.pe';

export type OpenpayCharge = {
  id: string;
  status?: string;
  amount?: number;
  currency?: string;
  description?: string;
  order_id?: string;
  authorization?: string;
  payment_method?: {
    type?: string;
    reference?: string;
    barcode_url?: string;
  };
  error_code?: string | number;
  description_error?: string;
  [key: string]: unknown;
};

export type OpenpayError = {
  error_code?: string | number;
  description?: string;
  message?: string;
  http_code?: number;
  category?: string;
};

@Injectable()
export class OpenpayService {
  private readonly client: InstanceType<typeof Openpay>;

  constructor(private readonly config: ConfigService) {
    const merchantId = this.config.get<string>('OPENPAY_MERCHANT_ID');
    const privateKey = this.config.get<string>('OPENPAY_PRIVATE_KEY');
    if (!merchantId || !privateKey) {
      // Se instancia igual; createCharge validará y lanzará claro
      this.client = null as unknown as InstanceType<typeof Openpay>;
      return;
    }
    const isProduction =
      this.config.get<string>('OPENPAY_PRODUCTION') === 'true';
    // 3er arg: isProductionReady — false = sandbox
    this.client = new Openpay(merchantId, privateKey, isProduction);
    this.client.setTimeout(90000);
  }

  isConfigured() {
    const merchantId = this.config.get<string>('OPENPAY_MERCHANT_ID');
    const privateKey = this.config.get<string>('OPENPAY_PRIVATE_KEY');
    return Boolean(merchantId && privateKey && this.client);
  }

  createCharge(payload: Record<string, unknown>): Promise<OpenpayCharge> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Openpay no está configurado. Revisa OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY',
      );
    }

    return new Promise((resolve, reject) => {
      this.client.charges.create(
        payload,
        (error: OpenpayError | null, body: OpenpayCharge) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(body);
        },
      );
    });
  }

  getCharge(chargeId: string): Promise<OpenpayCharge> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Openpay no está configurado. Revisa OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY',
      );
    }

    return new Promise((resolve, reject) => {
      this.client.charges.get(
        chargeId,
        (error: OpenpayError | null, body: OpenpayCharge) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(body);
        },
      );
    });
  }

  createWebhook(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Openpay no está configurado');
    }
    return new Promise((resolve, reject) => {
      this.client.webhooks.create(
        data,
        (error: OpenpayError | null, body: Record<string, unknown>) => {
          if (error) reject(error);
          else resolve(body);
        },
      );
    });
  }

  verifyWebhook(
    webhookId: string,
    verificationCode: string,
  ): Promise<Record<string, unknown>> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Openpay no está configurado');
    }
    return new Promise((resolve, reject) => {
      this.client.webhooks.verify(
        webhookId,
        verificationCode,
        (error: OpenpayError | null, body: Record<string, unknown>) => {
          if (error) reject(error);
          else resolve(body);
        },
      );
    });
  }

  listWebhooks(): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Openpay no está configurado');
    }
    return new Promise((resolve, reject) => {
      this.client.webhooks.list(
        (error: OpenpayError | null, body: Record<string, unknown>[]) => {
          if (error) reject(error);
          else resolve(body || []);
        },
      );
    });
  }

  isProduction() {
    return this.config.get<string>('OPENPAY_PRODUCTION') === 'true';
  }
}
