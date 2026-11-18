#!/usr/bin/env python3
"""Read-only cross-instrument TSETMC event alignment audit. No trading approval."""
import argparse
from datetime import datetime
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path

def as_rows(path, key):
    raw = Path(path).read_bytes()
    payload = json.loads(raw, parse_float=Decimal)
    rows = payload.get(key) if isinstance(payload, dict) else None
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"{key}: missing or empty list")
    if len(rows) > 50000:
        raise ValueError(f"{key}: implausible row count")
    return rows, hashlib.sha256(raw).hexdigest()

def day(value):
    if type(value) is not int or len(str(value)) != 8:
        raise ValueError("Invalid date")
    return datetime.strptime(str(value), "%Y%m%d").date()

def price(value):
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        raise ValueError("Non-numeric price")
    try:
        val = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError("Invalid price") from exc
    if not val.is_finite() or val <= 0:
        raise ValueError("Nonpositive or nonfinite price")
    return val

def audit(daily, adjustments, inscode):
    if not inscode.isascii() or not inscode.isdecimal() or not (8 <= len(inscode) <= 25):
        raise ValueError("Invalid instrument code")
    dates = [day(row["dEven"]) for row in daily]
    if dates != sorted(set(dates), reverse=True):
        raise ValueError("Daily history must be unique and descending")
    for row in daily + adjustments:
        if str(row.get("insCode")) != inscode:
            raise ValueError("Mixed or unexpected instrument codes")
    for row in daily:
        price(row["pClosing"])
    preceding = {daily[i]["dEven"]: daily[i + 1] for i in range(len(daily) - 1)}
    seen = set()
    results = []
    for event in adjustments:
        event_date = event["dEven"]
        day(event_date)
        if event_date in seen:
            raise ValueError("Duplicate adjustment event")
        seen.add(event_date)
        before = price(event["pClosingNotAdjusted"])
        after = price(event["pClosing"])
        prior = preceding.get(event_date)
        if prior is None:
            status = "NO_PREVIOUS_DAILY_RECORD_IN_CAPTURE"
            difference = None
            prior_date = None
        else:
            reference = price(prior["pClosing"])
            difference = before - reference
            status = "EXACT" if difference == 0 else "MISMATCH_REVIEW_REQUIRED"
            prior_date = prior["dEven"]
        results.append({
            "eventDate": event_date,
            "previousSessionDate": prior_date,
            "preAdjustmentRial": str(before),
            "postAdjustmentRial": str(after),
            "previousSessionCloseRial": str(price(prior["pClosing"])) if prior else None,
            "differenceRial": str(difference) if difference is not None else None,
            "comparison": status,
            "candidateAdjustmentRatio": str(after / before),
            "ratioSourceAttested": False,
        })
    return {
        "insCode": inscode, "dailyRows": len(daily), "events": results,
        "exact": sum(x["comparison"] == "EXACT" for x in results),
        "mismatched": sum(x["comparison"] == "MISMATCH_REVIEW_REQUIRED" for x in results),
        "missingReference": sum(x["comparison"] == "NO_PREVIOUS_DAILY_RECORD_IN_CAPTURE" for x in results),
        "independentCorporateActionValidation": False,
        "historyBasisAuthenticated": False, "tradingSignalsEnabled": False,
        "financialAcceptance": False,
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inscode", required=True)
    parser.add_argument("--daily", required=True)
    parser.add_argument("--adjustments", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    days, daily_hash = as_rows(args.daily, "closingPriceDaily")
    events, event_hash = as_rows(args.adjustments, "priceAdjust")
    report = audit(days, events, args.inscode)
    report["sourceSHA256"] = {"daily": daily_hash, "adjustments": event_hash}
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("EXACT", report["exact"], "MISMATCHED", report["mismatched"],
          "MISSING_REFERENCE", report["missingReference"], "ACCEPTED", False)

if __name__ == "__main__":
    main()
