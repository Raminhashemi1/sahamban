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

## Full local backup and version compatibility (v148)

The in-app local backup file includes only the following allowlisted browser-storage records when they exist: imported broker holdings, one prior broker snapshot, saved risk portfolio, alert settings, and the public-instrument watchlist. It **does not** include recorded alert audio, manual market instrument mappings, browser caches, tokens, other websites' data or other unknown storage keys. It is not a backup of the entire device.

The backup is an **unencrypted JSON file containing sensitive portfolio data**. Download and protect it on the user's own device. Do not upload it to GitHub or use it as an issue attachment.

A restore checks the backup format and schema version (`sahamban-local-backup`, version `1`), validates each recognized record, and asks for explicit consent. It does **not** silently migrate legacy portfolio/holdings versions 1 into version 2; application readers retain their own legacy conversion rules. Unknown schema versions and unknown keys fail closed. The restore changes only keys explicitly contained in the file, and attempts to roll back modified keys after a storage error. If rollback also fails, the status clearly warns that local state may be inconsistent and instructs the user to preserve the external backup.

Use this backup **before** updating browsers or moving to a new phone; importing the JSON into a different profile restores only these allowlisted keys. Reload the app after a successful restore to make its in-memory state reflect the new storage. No financial data is transmitted by this module.
