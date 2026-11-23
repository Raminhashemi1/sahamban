import { createBillingRouter } from './routes.mjs';
import { verifyBazaarPurchase } from '../server/providers/bazaar-verifier.mjs';
import { verifyMyketPurchase } from '../server/providers/myket-verifier.mjs';

const CANONICAL_PLAN_IDS = Object.freeze([
  'SAHAMBAN_PRO_30D',
  'SAHAMBAN_PRO_60D',
  'SAHAMBAN_PRO_90D',
  'SAHAMBAN_PRO_180D',
  'SAHAMBAN_PRO_365D'
]);

function parseJsonMap(value, name) {
  if (typeof value !== 'string' || !value) throw new TypeError(name + '_NOT_CONFIGURED');
  let parsed;
  try { parsed = JSON.parse(value); } catch {
    throw new TypeError(name + '_INVALID');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError(name + '_INVALID');
  }
  const expected = [...CANONICAL_PLAN_IDS].sort();
  const actual = Object.keys(parsed).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(name + '_MUST_DEFINE_EXACTLY_FIVE_PLANS');
  }
  const values = Object.values(parsed);
  if (values.some((sku) => typeof sku !== 'string' || !sku.trim() || sku.length > 200) ||
      new Set(values).size !== values.length) {
    throw new TypeError(name + '_INVALID_PRODUCT_IDS');
  }
  return parsed;
}

function requireNonEmptyEnv(env, key) {
  if (typeof env[key] !== 'string' || !env[key].trim()) {
    throw new TypeError(key + '_NOT_CONFIGURED');
  }
}

/**
 * Creates the independent billing Worker fetch handler.
 *
 * authenticateRequest must be the host application's REAL commercial session
 * verifier. It is injected because the technical dossier does not define the
 * production login/session token issuer or verification contract.
 */
export function createBillingWorker(env, { authenticateRequest }) {
  if (env.BILLING_V2_ENABLED !== 'true') {
    return {
      fetch: async () => new Response(
        JSON.stringify({ ok: false, error: 'BILLING_DISABLED' }),
        { status: 503, headers: { 'content-type': 'application/json' } }
      )
    };
  }
  if (typeof authenticateRequest !== 'function') {
    throw new TypeError('COMMERCIAL_AUTHENTICATOR_REQUIRED');
  }
  if (!['BAZAAR', 'MYKET'].includes(env.BILLING_STORE)) {
    throw new TypeError('BILLING_STORE_MUST_BE_SET_PER_DEPLOYMENT');
  }

  const storeProductMap = env.BILLING_STORE === 'BAZAAR'
    ? parseJsonMap(env.BAZAAR_SKU_MAP, 'BAZAAR_SKU_MAP')
    : parseJsonMap(env.MYKET_SKU_MAP, 'MYKET_SKU_MAP');

  if (env.BILLING_STORE === 'BAZAAR') {
    for (const key of ['BAZAAR_PACKAGE_NAME', 'BAZAAR_CLIENT_ID',
      'BAZAAR_CLIENT_SECRET', 'BAZAAR_REFRESH_TOKEN']) {
      requireNonEmptyEnv(env, key);
    }
  } else {
    for (const key of ['MYKET_PACKAGE_NAME', 'MYKET_PUBLIC_KEY_BASE64']) {
      requireNonEmptyEnv(env, key);
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(env.MYKET_PUBLIC_KEY_BASE64) ||
        env.MYKET_PUBLIC_KEY_BASE64.length % 4 !== 0) {
      throw new TypeError('MYKET_PUBLIC_KEY_BASE64_INVALID');
    }
  }
  const productMaps = { [env.BILLING_STORE]: storeProductMap };
  const providerVerifiers = {
    BAZAAR: (args) => verifyBazaarPurchase({
      ...args,
      config: {
        packageName: env.BAZAAR_PACKAGE_NAME,
        clientId: env.BAZAAR_CLIENT_ID,
        clientSecret: env.BAZAAR_CLIENT_SECRET,
        refreshToken: env.BAZAAR_REFRESH_TOKEN
      },
      fetchImpl: fetch,
      cryptoImpl: crypto
    }),
    MYKET: (args) => verifyMyketPurchase({
      ...args,
      config: {
        packageName: env.MYKET_PACKAGE_NAME,
        publicKeyBase64: env.MYKET_PUBLIC_KEY_BASE64
      },
      cryptoImpl: crypto
    })
  };

  const fetchHandler = createBillingRouter({
    db: env.SAHAMBAN_DB,
    authenticateRequest,
    resolveStore: async () => env.BILLING_STORE,
    productMaps,
    providerVerifiers,
    allowedOrigin: env.PWA_ORIGIN
  });
  return { fetch: fetchHandler };
}
