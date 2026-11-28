# Release revalidation — 2026-11-28

This documentation-only commit requests fresh CI on the current integration head after the latest Billing V2, authentication, Android, and workflow updates.

Expected gates:
- Dual-store Billing V2, password-auth, Worker bundle and local D1 migration validation.
- Android Bazaar and Myket debug build.
- Release build gate for both store flavors with checkout forcibly disabled; artifacts must remain unsigned and explicitly NOT STORE READY.
- PR smoke/browser checks.

This file changes no application code, secrets, database, Worker configuration, product identifiers, or release settings.

The authoritative publication sequence remains two-phase as recorded in subscription-module/LINE-END.md: initial signed publication with checkout disabled; only after that publication, create/map the five subscription plans and proceed through the separate commercial/device acceptance gates for the billing-enabled update.
