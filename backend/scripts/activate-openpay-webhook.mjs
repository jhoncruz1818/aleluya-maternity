/**
 * Registra y verifica el webhook Openpay contra una URL pública (túnel).
 * Uso: node scripts/activate-openpay-webhook.mjs <publicBaseUrl>
 * Ejemplo: node scripts/activate-openpay-webhook.mjs https://long-cats-bake.loca.lt
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Openpay = require('openpay');
Openpay.BASE_URL = 'https://api.openpay.pe';
Openpay.SANDBOX_URL = 'https://sandbox-api.openpay.pe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envText = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const publicBase = (process.argv[2] || '').replace(/\/$/, '');
if (!publicBase) {
  console.error('Falta URL pública. Ej: node scripts/activate-openpay-webhook.mjs https://xxx.trycloudflare.com');
  process.exit(1);
}

const webhookUrl = `${publicBase}/api/payments/webhook/openpay`;
/** Donde Openpay envía la verificación (túnel local o API en Railway). */
const verifyPollUrl = `${publicBase}/api/payments/webhook/openpay/last-verification`;
const merchantId = env.OPENPAY_MERCHANT_ID;
const privateKey = env.OPENPAY_PRIVATE_KEY;
const isProd = env.OPENPAY_PRODUCTION === 'true';
const setupSecret = env.WEBHOOK_SETUP_SECRET || '';

const openpay = new Openpay(merchantId, privateKey, isProd);
openpay.setTimeout(30000);

function setupHeaders(extra = {}) {
  const headers = { 'Bypass-Tunnel-Reminder': 'true', ...extra };
  if (setupSecret) {
    headers['x-webhook-setup-secret'] = setupSecret;
  }
  return headers;
}

function promisify(fn) {
  return (...args) =>
    new Promise((resolveP, reject) => {
      fn(...args, (err, body) => (err ? reject(err) : resolveP(body)));
    });
}

const listWebhooks = () => promisify(openpay.webhooks.list.bind(openpay.webhooks))();
const createWebhook = (data) => promisify(openpay.webhooks.create.bind(openpay.webhooks))(data);
const verifyWebhook = (id, code) =>
  promisify(openpay.webhooks.verify.bind(openpay.webhooks))(id, code);
const deleteWebhook = (id) => promisify(openpay.webhooks.delete.bind(openpay.webhooks))(id);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probePublic() {
  try {
    const res = await fetch(
      `${publicBase}/api/payments/webhook/openpay/last-verification`,
      { headers: setupHeaders() },
    );
    const text = await res.text();
    console.log(`Probe público HTTP ${res.status}: ${text.slice(0, 200)}`);
    return res.ok;
  } catch (e) {
    console.warn('Probe público falló:', e.message);
    return false;
  }
}

async function waitVerification(timeoutMs = 90000) {
  if (!setupSecret) {
    console.warn(
      'WEBHOOK_SETUP_SECRET vacío en .env — el endpoint de verificación puede rechazar la consulta',
    );
  }
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(verifyPollUrl, {
        headers: setupHeaders(),
      });
      const data = await res.json();
      if (data?.code) return data;
    } catch {
      // reintento
    }
    process.stdout.write('.');
    await sleep(2000);
  }
  return null;
}

async function main() {
  console.log('Merchant:', merchantId);
  console.log('Webhook URL:', webhookUrl);
  console.log('Host Openpay:', isProd ? 'api.openpay.pe' : 'sandbox-api.openpay.pe');

  const ok = await probePublic();
  if (!ok) {
    console.warn(
      'La URL pública no responde limpio (localtunnel a veces pide password). Seguimos; Openpay puede fallar.',
    );
  }

  let existing = [];
  try {
    existing = await listWebhooks();
    console.log('Webhooks actuales:', JSON.stringify(existing, null, 2));
  } catch (e) {
    console.warn('No se pudo listar webhooks:', e?.description || e?.message || e);
  }

  // Si ya existe uno con la misma URL, reutilizar / verificar
  const same = (Array.isArray(existing) ? existing : []).find(
    (w) => String(w.url || '') === webhookUrl,
  );

  let webhook = same;
  if (!webhook) {
    console.log('Creando webhook...');
    try {
      webhook = await createWebhook({
        url: webhookUrl,
        user: env.OPENPAY_WEBHOOK_USER || undefined,
        password: env.OPENPAY_WEBHOOK_PASSWORD || undefined,
        event_types: [
          'charge.succeeded',
          'charge.failed',
          'charge.cancelled',
          'charge.created',
          'verification',
        ],
      });
      console.log('Webhook creado:', JSON.stringify(webhook, null, 2));
    } catch (e) {
      console.error('Error al crear webhook:', JSON.stringify(e, null, 2));
      // Intentar sin event_types (algunas cuentas PE usan defaults)
      try {
        webhook = await createWebhook({ url: webhookUrl });
        console.log('Webhook creado (mínimo):', JSON.stringify(webhook, null, 2));
      } catch (e2) {
        console.error('Error create mínimo:', JSON.stringify(e2, null, 2));
        process.exit(1);
      }
    }
  } else {
    console.log('Ya existe webhook con esa URL:', webhook.id, 'status=', webhook.status);
  }

  const id = String(webhook.id || '');
  const status = String(webhook.status || '').toLowerCase();
  if (status === 'verified') {
    console.log('OK: webhook ya verificado', id);
    return;
  }

  console.log(`Esperando verification_code en ${verifyPollUrl} (hasta 90s)...`);
  const ver = await waitVerification(90000);
  console.log('');
  if (!ver?.code) {
    console.error(
      'No llegó verification_code. Revisa que la URL pública reciba POSTs de Openpay.',
    );
    console.log('Webhook id (para verificar a mano):', id);
    process.exit(2);
  }

  console.log('Código recibido:', ver.code, 'at', ver.at);
  try {
    const result = await verifyWebhook(id, ver.code);
    console.log('Verificado:', JSON.stringify(result, null, 2));
    console.log('OK webhook activo:', id, webhookUrl);
  } catch (e) {
    console.error('Error al verificar:', JSON.stringify(e, null, 2));
    process.exit(3);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
