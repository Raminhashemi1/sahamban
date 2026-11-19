# PWA ↔ Android native billing bridge contract

## Purpose
The technical dossier describes a Kotlin/Java Android WebView wrapper that loads the PWA. The purchase UI and native billing coordinator are not connected. This document defines a clean, independent integration boundary and does not reuse legacy bridge or billing code.

## Trust boundaries
- The PWA may request a plan purchase and display a sanitized result.
- Only native Android code may call the store SDK.
- Only the backend decides whether a purchase is valid and whether entitlement is active.
- Raw purchase tokens, signatures, original receipt JSON, store credentials, and auth secrets must never be exposed to JavaScript.
- JavaScript must not submit client-selected price, duration, SKU, user ID, or expiry as authoritative data.

## Transport
Preferred transport for a remote PWA in Android WebView: an origin-restricted WebMessage bridge, such as AndroidX WebKit WebViewCompat.addWebMessageListener, with an exact HTTPS origin allowlist. Do not expose a broad addJavascriptInterface bridge to arbitrary navigations.

The production PWA origin is not specified in the dossier. It lists PWA_ORIGIN as a Worker setting but gives no value. The bridge must receive the exact approved origin from deployment configuration; do not use wildcard, substring checks, or guessed hostnames.

## Message envelope
Every request and response uses JSON with version (integer, currently 1), requestId (random UUID), action (allowlisted string), and payload (action-specific object). Native validates message size, JSON shape, version, requestId, action, and payload before dispatch.

## PWA → native requests
- billing.getAvailability: empty payload; returns available, configured store, and stable public error code if unavailable.
- billing.getPlans: empty payload; native obtains canonical plan display data from trusted backend/catalog. The dossier says Bazaar display prices should be obtained from Bazaar.
- billing.purchase: payload contains only planId, e.g. SAHAMBAN_PRO_30D. Native creates the authenticated order, resolves SKU for its configured store, launches the matching SDK, submits evidence to server verification, and waits for settlement.
- billing.restore: empty payload; native queries owned purchases and submits eligible evidence for server reconciliation.
- billing.getEntitlement: empty payload; returns the authenticated user's current server entitlement.

## Native → PWA response
Response envelope: version, requestId, ok, result (sanitized), and error (stable public code only; never raw SDK/backend exception text).

Purchase result states: PURCHASED_AND_SETTLED, CANCELLED, PENDING_VERIFICATION, PURCHASE_FAILED, SETTLED_CONSUMPTION_PENDING.

The PWA must refresh billing.getEntitlement from the backend after a purchase result. It must not infer access solely from a client-side store callback.

## Navigation and lifecycle
- Enable bridge only for the exact configured trusted HTTPS origin.
- Disable bridge access before loading any non-trusted URL.
- Open external links outside the privileged WebView.
- Re-check trusted origin on every navigation and message.
- Handle Activity recreation, process death, network interruption, duplicate requestId, and purchase recovery.
- A pending verification result must not be treated as success or final failure; preserve recoverable state natively.

## Store selection
Store selection is a build/distribution configuration, never a JavaScript-supplied value. Bazaar distribution instantiates only the Bazaar adapter; Myket distribution only the Myket adapter. Never accept a store name from a web message to select the payment provider.

## Open decisions before implementation
- Exact production PWA HTTPS origin.
- Whether both stores accept the same Android applicationId and signing identity for the intended distribution.
- Official Myket SDK version and trusted server verification mechanism.
- Final app identity/authentication source. The dossier says the pilot token is not a commercial login system.