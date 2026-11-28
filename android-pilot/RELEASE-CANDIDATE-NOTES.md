# Sahmino Release Candidate — build gate

This branch is an isolated release-candidate workspace:
`release/sahmino-7day-candidate-2026-11-28`

## Scope of this gate
The Android release-build gate is intentionally run with billing disabled and without release-signing credentials. It verifies that the Bazaar and Myket Android release variants can be assembled with the current package identity and that the generated BuildConfig keeps checkout disabled.

## Important limits
- A successful result is an unsigned engineering build only.
- It is not a store-ready APK and does not prove real Bazaar/Myket checkout.
- Do not upload this artifact to either marketplace.
- Store signing, SKU/public-key configuration, backend deployment, and real-device acceptance remain separate release gates requiring owner-controlled credentials and marketplace access.
