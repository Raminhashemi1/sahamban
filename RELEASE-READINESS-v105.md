# Release readiness — سهام‌بان v105

## Completed and automatically verified
- Homepage module discovery and beginner 3-step workflow
- Mobile 15-column table, compact view and read-only holding cards
- Symbol-only search, no-results messages and card/table switches
- Keyboard skip navigation, visible focus and 44px mobile targets
- Offline asset bundling, old-cache cleanup and update notification
- Portfolio, NAV, technical analysis and risk regression workflows
- Chromium 320/390/768/1280 viewports and synthetic 100-row holding reports

## Remaining validation (requires devices or real-world evidence)
- Manual testing on physical iOS Safari and low-memory Android browsers
- Real user performance measurements under weak network and constrained hardware
- Screen-reader validation with VoiceOver and TalkBack, including Persian pronunciation
- Live market availability and freshness against real upstream sources during trading hours

## Interpretation
Passing automated CI constitutes **release readiness under current automated tests**, not proof of a universally complete financial product.
No scientific completion percentage is available without a fixed acceptance checklist with agreed weights.
Do not modify NAV, pricing, financial formulas or persistence as part of the UX stabilization scope.
