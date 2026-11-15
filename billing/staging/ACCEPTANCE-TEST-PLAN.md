# Staging transaction and security acceptance plan (NOT EXECUTED)

Linked to draft PR #184, issue #179. Execution requires a dedicated PostgreSQL staging database, scoped test users and a reviewer-approved server boundary. This file documents reproducible prerequisites and expected outcomes; it is not a CI PASS.

## Setup and safety
- Apply `billing/staging/001_sahmino_billing_staging.sql` to a disposable PostgreSQL instance only.
- App code and production billing remain disconnected. No real receipts or credentials.
- Fixture IDs are random UUIDs; simulate only provider approval, never accept client-provided `APPROVED` as payment evidence.
- Staging role must be denied access to production schemas, and all provider adapters start disabled.
- Account identity comes from an authenticated server session; API parameters must not override it.

## Required cases and expected assertions
| ID | Scenario | Required result |
|---|---|---|
| S01 | Verify 30,60,90,180,365-day plans in each of four channels | Correct expiry; 270 rejected |
| S02 | Same channel + purchase ID processed twice | One purchase, one credit, idempotent response |
| S03 | Same purchase ID replayed under different account or plan | Conflict, no credit |
| S04 | Same purchase ID on *different* channels | Separate purchases, as allowed by provider verification |
| S05 | Two different purchases for same account at same instant | Serialized account updates, no lost expiry |
| S06 | Simultaneous duplicate requests from two DB connections | One wins, one idempotent; no double credit |
| S07 | Error after purchase insert, before snapshot write | Entire transaction rolled back |
| S08 | Refund notice repeated | One status transition, one recomputation |
| S09 | Refund notice arrives before purchase verification | Reconcile/pending; never grant |
| S10 | Forged provider token, package mismatch, pending payment | No verified purchase or entitlement |
| S11 | Provider timeout or ack failure | No unauthorized credit; safe retry via outbox |
| S12 | Two accounts buy concurrently | No cross-account change |
| S13 | Expired entitlement and UTC leap-year boundary | Correct 24-hour-day accounting |
| S14 | Out-of-order refunds for stacked periods | Deterministic recompute; approved policy required |
| S15 | Production API accidentally fed synthetic events | Explicit rejection; no real entitlements |
| S16 | Any paid plan while market-data gates fail | Financial signals remain disabled |

## Database race test skeleton (future integration harness)
1. Open connections A and B with independent transactions.
2. For same account_id, both attempt to lock `account_lock` via `SELECT ... FOR UPDATE`.
3. Hold A after its purchase insert; verify B blocks until A commits.
4. A commits purchase, audit event, outbox and snapshot together.
5. B retries/continues and observes committed purchase by unique (channel,provider_purchase_id), returning idempotent outcome.
6. Verify exactly one purchase and exactly one credit. Repeat with two distinct purchases; both must contribute once.
7. Trigger an artificial exception before A commits; confirm zero persisted rows from that transaction.
8. Repeat S08-S09 using verified webhook fixtures and approval-controlled refund policy.

## Release gates (all currently BLOCKED)
- Provision a reviewed backend and PostgreSQL test database.
- Implement authenticated identity binding, provider-specific server verification, transaction handler and outbox worker.
- Run S01-S16 against a fixed commit and capture logs and CI run URLs.
- Security/privacy review including PII minimization, secrets, webhook auth, audit, retention and rollback.
- Independently validate console capabilities for each provider and merchant account eligibility.
- Obtain owner release approval before any live integration, merge, APK replacement or real payments.
