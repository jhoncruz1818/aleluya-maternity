/**
 * Openpay.js (Perú) — carga scripts, device session y tokenización de tarjeta.
 * Docs: https://documents.openpay.pe/documentacion/openpay-js
 */

const OPENPAY_JS = 'https://js.openpay.pe/openpay.v1.min.js';
const OPENPAY_DATA_JS = 'https://js.openpay.pe/openpay-data.v1.min.js';

export type OpenpayToken = {
  id: string;
  card?: {
    card_number?: string;
    brand?: string;
    type?: string;
  };
};

type OpenpayGlobal = {
  setId: (merchantId: string) => void;
  setApiKey: (publicKey: string) => void;
  setSandboxMode: (sandbox: boolean) => void;
  deviceData: {
    setup: (formId?: string, inputId?: string) => string;
  };
  token: {
    create: (
      data: {
        card_number: string;
        holder_name: string;
        expiration_year: string;
        expiration_month: string;
        cvv2: string;
      },
      success: (response: { data: OpenpayToken; status: number }) => void,
      error: (response: {
        data: { description?: string; error_code?: number; message?: string };
        message?: string;
      }) => void,
    ) => void;
  };
};

declare global {
  interface Window {
    OpenPay?: OpenpayGlobal;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error(`No se pudo cargar ${src}`)),
      );
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.body.appendChild(script);
  });
}

export function isOpenpayConfigured() {
  const merchant = process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID ?? '';
  const key = process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY ?? '';
  return Boolean(merchant && key && !key.includes('xxxxxxxx'));
}

export async function loadOpenpay(): Promise<OpenpayGlobal> {
  if (typeof window === 'undefined') {
    throw new Error('Openpay solo funciona en el navegador');
  }
  if (!isOpenpayConfigured()) {
    throw new Error(
      'Openpay no está configurado. Revisa NEXT_PUBLIC_OPENPAY_MERCHANT_ID y NEXT_PUBLIC_OPENPAY_PUBLIC_KEY',
    );
  }

  await loadScript(OPENPAY_JS);
  await loadScript(OPENPAY_DATA_JS);

  if (!window.OpenPay) {
    throw new Error('OpenPay.js no disponible');
  }

  const merchantId = process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID!;
  const publicKey = process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY!;
  const sandbox =
    (process.env.NEXT_PUBLIC_OPENPAY_SANDBOX ?? 'true') !== 'false';

  window.OpenPay.setId(merchantId);
  window.OpenPay.setApiKey(publicKey);
  window.OpenPay.setSandboxMode(sandbox);

  return window.OpenPay;
}

/**
 * Genera device_session_id (antifraude). Ideal al montar el checkout.
 */
export async function setupDeviceSession(): Promise<string> {
  const OpenPay = await loadOpenpay();
  // Sin formId OpenPay crea un input oculto y devuelve el session id
  const sessionId = OpenPay.deviceData.setup();
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('No se pudo generar device_session_id');
  }
  return sessionId;
}

export type CardFormValues = {
  cardNumber: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
};

export async function createCardToken(
  card: CardFormValues,
): Promise<OpenpayToken> {
  const OpenPay = await loadOpenpay();

  const card_number = card.cardNumber.replace(/\s+/g, '');
  let expiration_year = card.expYear.trim();
  if (expiration_year.length === 4) {
    expiration_year = expiration_year.slice(2);
  }

  return new Promise((resolve, reject) => {
    OpenPay.token.create(
      {
        card_number,
        holder_name: card.holderName.trim(),
        expiration_year,
        expiration_month: card.expMonth.padStart(2, '0'),
        cvv2: card.cvv.trim(),
      },
      (response) => {
        if (response?.data?.id) {
          resolve(response.data);
          return;
        }
        reject(new Error('Openpay no devolvió un token'));
      },
      (response) => {
        const msg =
          response?.data?.description ||
          response?.data?.message ||
          response?.message ||
          'No se pudo tokenizar la tarjeta';
        reject(new Error(msg));
      },
    );
  });
}
