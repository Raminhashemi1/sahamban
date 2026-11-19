# One product, store-specific distribution builds

The intended architecture is one shared application source tree and one shared
subscription/backend model, with store-specific Android build configurations
when required by the SDKs or store publication requirements.

Candidate flavors:
- bazaar: only Bazaar billing adapter and SDK.
- myket: only Myket billing adapter and SDK.

Shared UI, authentication, account, plan catalog, and entitlement logic stay in
the common source set.

Do not add an applicationIdSuffix for production unless a deliberate separate
package identity is required. Confirm package identity, signing, Gradle version,
SDK versions, and store policies before applying any build configuration.

Product IDs are store-specific and must be configured separately in the backend.
