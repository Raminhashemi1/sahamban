#!/usr/bin/env python3
"""Reproducible validation for the bounded Vesakht 3-basis review JSON.

Usage: python3 day3_validate_reconstruction.py vasakht-three-mode-full-ohlc-reconstruction-20261110.json
No network access; never upgrades secondary evidence to issuer-primary attestation.
"""
import sys, json, hashlib
from decimal import Decimal
from pathlib import Path

EXPECTED = {
 "daily": "c974e81430cbf58240d0b89018bdadfd60fd352bf78299f8d2e396634d7dece3",
 "adjustments": "9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd",
}
FIELDS = ("priceFirst","priceMax","priceMin","pClosing","priceYesterday","pDrCotVal")
def check(ok, msg):
 if not ok: raise SystemExit("FAIL: "+msg)
 print("PASS: "+msg)

p=Path(sys.argv[1] if len(sys.argv)>1 else "vasakht-three-mode-full-ohlc-reconstruction-20261110.json")
d=json.loads(p.read_text(encoding="utf-8"))
check(d["instrument"]["insCode"]=="25514780181345713","instrument insCode")
check(d["source_capture"]["daily_sha256"]==EXPECTED["daily"],"captured daily SHA-256")
check(d["source_capture"]["adjustments_sha256"]==EXPECTED["adjustments"],"captured adjustments SHA-256")
rows=d["rows"]; dates=[int(r["date"]) for r in rows]
check(len(rows)==500 and len(set(dates))==500,"500 unique sessions")
check(dates==sorted(dates,reverse=True),"newest-to-oldest chronology")
check(all(all(k in r["mode0"] and k in r["mode1"] and k in r["mode2_conditional"] for k in FIELDS) for r in rows),"six OHLC/close fields present in all three labelled bases")
check(all(r["mode0"]==r["mode1"] for r in rows[:1]),"newest row preserved raw")
check(all(Decimal(r["mode2_conditional"][k])==Decimal(r["mode0"][k]) for r in rows for k in FIELDS),"conditional mode 2 equals raw numerically")
check(all(len(r["applied_events"]) in (0,1,2) for r in rows),"event application cardinality")
events={int(e["date"]):e for e in d["events_used"]}
check(set(events)=={20250202,20260120},"two in-window adjustment events")
for day,e in events.items():
 row=next(r for r in rows if int(r["date"])==day)
 check(Decimal(row["mode0"]["pClosing"])==Decimal(e["before"]),f"{day} raw event-day close matches TSETMC pre-adjust close")
 check(Decimal(e["after"])>0 and Decimal(e["before"])>0,f"{day} event ratio positive")
check(d["checks"]["OHLC_reconstruction"]=="PASS","recorded OHLC reconstruction assertion")
check(d["checks"]["mode2_classification"]=="BLOCKED","mode 2 classification remains explicitly blocked")
check(d["day3FinalAccepted"] is False and d["historyBasisAuthenticated"] is False and d["tradingSignalsEnabled"] is False,"fail-closed acceptance and trading flags")
print("LIMITATION: mode 2 is only a conditional raw series; no issuer-primary corporate-action ledger or direct tse-client 0/1/2 runtime capture is supplied.")
print("RESULT: bounded numerical artifact internally validated; NOT final financial acceptance.")
