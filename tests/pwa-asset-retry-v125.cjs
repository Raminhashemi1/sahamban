'use strict';

const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH',
  'EHOSTUNREACH', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET'
]);

function retryableNetworkError(error) {
  return error instanceof TypeError ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError' ||
    RETRYABLE_CODES.has(error?.code) ||
    RETRYABLE_CODES.has(error?.cause?.code);
}

async function fetchWithRetry(fetchImpl, url, options = {}, config = {}) {
  const maxAttempts = config.maxAttempts ?? 2;
  const delayMs = config.delayMs ?? 750;
  const wait = config.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError('maxAttempts must be a positive integer');
  }
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && retryableNetworkError(error)) {
        await wait(delayMs);
        continue;
      }
      throw error;
    }
    if (response.ok) return { response, attempts: attempt };
    if (attempt < maxAttempts && RETRYABLE_HTTP.has(response.status)) {
      await wait(delayMs);
      continue;
    }
    throw new Error('HTTP ' + response.status);
  }
  throw lastError || new Error('Public asset request failed');
}

module.exports = { RETRYABLE_HTTP, retryableNetworkError, fetchWithRetry };
