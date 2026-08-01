declare module 'openpay' {
  class Openpay {
    static BASE_URL: string;
    static SANDBOX_URL: string;
    static API_VERSION: string;
    static SANDBOX_API_VERSION: string;

    constructor(
      merchantId: string,
      privateKey: string,
      isProductionReady?: boolean,
    );

    merchantId: string;
    privateKey: string;
    isSandbox: boolean;
    timeout: number;
    charges: {
      create: (
        data: Record<string, unknown>,
        callback: (error: unknown, body: unknown) => void,
      ) => void;
      get: (
        id: string,
        callback: (error: unknown, body: unknown) => void,
      ) => void;
    };
    webhooks: {
      create: (
        data: Record<string, unknown>,
        callback: (error: unknown, body: unknown) => void,
      ) => void;
      verify: (
        webhookId: string,
        verificationCode: string,
        callback: (error: unknown, body: unknown) => void,
      ) => void;
      get: (
        webhookId: string,
        callback: (error: unknown, body: unknown) => void,
      ) => void;
      delete: (
        webhookId: string,
        callback: (error: unknown, body: unknown) => void,
      ) => void;
      list: (callback: (error: unknown, body: unknown) => void) => void;
    };
    setMerchantId: (id: string) => void;
    setPrivateKey: (key: string) => void;
    setProductionReady: (ready: boolean) => void;
    setTimeout: (ms: number) => void;
  }

  export = Openpay;
}
