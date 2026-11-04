# Security and privacy notes

## Data boundary

- Broker CSV/XLSX imports are parsed in the browser. The importer does not request brokerage usernames, passwords, session cookies or API keys.
- Imported holdings are stored in browser `localStorage` under `sahamban-broker-holdings-v1`. The app does not encrypt this data with an application-managed key. Anyone with access to the same unlocked browser profile may be able to inspect it.
- The JSON backup exported by the app is plaintext. Store it only in a location protected by the user's own device/account controls; do not publish it in a public repository or send it to support.
- The market quote overlay reads holdings locally and requests public instrument identifiers/prices. It must not include holding quantities, buy prices, portfolio totals or personal identifiers in outbound requests.
- Service-worker caches contain application assets. They are not a secure vault for personal data.
- The app is an experimental decision-support tool. It does not connect to a broker for trading and must not be represented as an execution system.

## Import parser safeguards

The broker XLSX reader applies compressed-file, entry-count, per-entry and aggregate expanded-size limits; rejects encrypted or unsupported ZIP entries; validates central-directory and local ZIP headers; restricts internal paths; bounds streamed decompression; and rejects XML DTD/entity declarations. CSV/XLSX previews use text nodes rather than HTML interpretation.

## User precautions

1. Use a private, trusted browser profile and lock the device.
2. Do not use the importer on a shared/public computer.
3. Treat downloaded JSON backups as sensitive financial data.
4. Remove local app data using browser site-data controls before handing a device to another person.
5. Never enter brokerage passwords, OTPs, session tokens or API keys into this app.

## Verification limits

CI tests exercise synthetic portfolios and parser fixtures. They do not prove the security of the user's device, browser extensions, operating system, market-data provider, or external CODAL publication. Physical-device testing and independent security review remain separate acceptance activities.
