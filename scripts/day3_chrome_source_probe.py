#!/usr/bin/env python3
"""Read-only bounded original-source probe, using browser-like TLS fingerprints.
No secrets, proxies, brokerage access, or trade capability.
Outputs raw bytes for manual inspection, never makes authenticity/acceptance claims.
Requires: pip install curl_cffi
"""
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys

MAX_BYTES = 12 * 1024 * 1024
INS = "25514780181345713"
SOURCES = {
 "tsetmc_daily": ("https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/"+INS+"/0", "daily"),
 "tsetmc_adjustments": ("https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/"+INS, "adjustments"),
 "exchange_isin": ("https://webgw.tse.ir/InstrumentProvider/api/v1/History/Archive/fa?InstrumentId=IRO1SAKH0007", "exchange"),
 "codal_30": ("https://codal.ir/DownloadFile.aspx?ft=1005&hs=5Wo3QKfOOObOOOKbPJKdmPwLDPfg%3D%3D&let=21", "codal"),
 "codal_80": ("https://www.codal.ir/DownloadFile.aspx?hs=ABPH8LdAUBh4bbE5xTOOObOOO9tA%3d%3d&ft=1005&let=20", "codal"),
}

def valid_day(value):
    val = str(value)
    if not re.fullmatch(r"(?:19|20|21)\d{6}", val):
        return False
    try:
        dt.datetime.strptime(val, "%Y%m%d")
        return True
    except ValueError:
        return False

def inspect(raw, kind):
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("empty_or_oversized")
    if kind == "codal":
        if raw.startswith(b"%PDF-"):
            return {"format": "pdf_candidate", "bytes": len(raw)}
        # HTML forms are review-only: a login/error screen is NOT a disclosure.
        raise ValueError("not_original_pdf_file")
    if kind == "exchange":
        # Provider schema is not authenticated; hold raw JSON for manual schema mapping.
        obj = json.loads(raw)
        if not isinstance(obj, (dict, list)):
            raise ValueError("exchange_json_not_object_or_array")
        return {"format": "exchange_json_unmapped", "sourceVerified": False}
    obj = json.loads(raw)
    field = "closingPriceDaily" if kind == "daily" else "priceAdjust"
    rows = obj.get(field) if isinstance(obj, dict) else None
    if not isinstance(rows, list) or not rows or len(rows) > 20000:
        raise ValueError("invalid_market_response_rows")
    for item in rows:
        if not isinstance(item, dict) or not valid_day(item.get("dEven")):
            raise ValueError("invalid_market_response_dates")
        if kind == "daily":
            close = item.get("pClosing")
            if type(close) not in (int, float) or not math.isfinite(close) or close <= 0:
                raise ValueError("invalid_market_price")
    if kind == "daily" and len(set(str(x["dEven"]) for x in rows)) != len(rows):
        raise ValueError("duplicate_session_dates")
    # Match original JSON decimal digits; no IEEE754 rounding for 17-digit IDs.
    tokens = re.findall(rb'"insCode"\s*:\s*(?:"([0-9]{8,25})"|([0-9]{8,25}))(?![0-9])',raw)
    if len(tokens) != len(rows) or any((a or b).decode("ascii") != INS for a,b in tokens):
        raise ValueError("original_inscode_lexeme_mismatch")
    return {"format": "tsetmc_json", "rowCount": len(rows),
            "earliest": min(str(x["dEven"]) for x in rows),
            "latest": max(str(x["dEven"]) for x in rows)}

def main():
    from curl_cffi import requests
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "out/day3-browser-tls").resolve()
    folder.mkdir(parents=True, exist_ok=True)
    report = {
        "instrument": "وساخت", "insCode": INS, "isin": "IRO1SAKH0007",
        "collectedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "transport": "curl_cffi chrome impersonation, HTTPS certificate verification enabled",
        "sourceAuthenticated": False, "issuerOriginalVerified": False,
        "historyBasisAuthenticated": False, "threeModesVerified": False,
        "day3FinalAccepted": False, "entryEligible": False, "tradingSignalsEnabled": False,
        "results": {},
    }
    for name,(url,kind) in SOURCES.items():
        outcome = {"requestedURL": url, "status": "NOT_CAPTURED"}
        try:
            # No untrusted redirect target or proxy; fixed public sources only.
            response = requests.get(url, impersonate="chrome", verify=True,
                                    allow_redirects=False, timeout=15,
                                    headers={"Accept": "application/json,application/pdf;q=0.9,*/*;q=0.5"})
            outcome["httpStatus"] = response.status_code
            if response.status_code != 200:
                raise ValueError("http_not_200")
            raw = response.content
            result = inspect(raw,kind)
            ext = ".pdf" if kind == "codal" else ".json"
            target = name + ext
            (folder / target).write_bytes(raw)
            outcome.update(status="CAPTURED_RAW_FOR_MANUAL_REVIEW", filename=target,
                           sha256=hashlib.sha256(raw).hexdigest(), sizeBytes=len(raw),
                           contentType=response.headers.get("Content-Type", ""), inspection=result)
        except Exception as exc:
            outcome["reason"] = type(exc).__name__ + ": " + str(exc)[:160]
        report["results"][name] = outcome
    (folder / "manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",
                                           encoding="utf8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    # Diagnostic should not break unrelated functional CI.
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
