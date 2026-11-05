# Prospective evidence (Gate B, not running live)
The server-only collector freezes the entire predeclared symbol universe for one Tehran market date.
All statuses including WAIT and missing history are preserved; D1 uniquely rejects replay or backfilling.
Triggers prohibit UPDATE/DELETE, SHA-256 records valid as-of-date price history, and D1.batch is atomic.
The trusted future operator must independently verify source history, run fixed release decision rules,
and schedule capture during the same local day. Neither official connectivity, live daily scheduling,
independently attested timestamps, prospective samples, nor validated future returns exist yet.
The adapter callbacks returning true in unit tests are synthetic; never trust client flags or scores.
Gate B stays OPEN; do not claim investment skill or monetisable recommendations.

The collector now runs the trusted, checked-in v50 indicator + v129 decision
engine itself (server/fixed-rule-evaluator.cjs), ignoring any browser or caller
supplied score. Each run stores SHA-256 of the exact source bytes of both
rule modules for future independent reproduction. Source verification remains
a separate required trusted callback and is not implemented by this adapter.
