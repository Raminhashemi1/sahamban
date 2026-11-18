#!/usr/bin/env python3
"""Opt-in read-only capture of TWO EXACT original CODAL AGM decision documents for وساخت.
Run: python3 scripts/day3_fetch_original_codal.py ./private-codal-evidence
Only fetches fixed, public original-source links. Writes raw bytes and SHA-256 locally.
No broker credentials, no order placement and no source/issuer attestation inference.
"""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

# Original CODAL file pointers, extracted from published hyperlinks to CODAL itself.
# 1403 source: Codal360 message (tracing 1304830) pointing to this PDF.
# 1404 source: corrected AGM republication NoavaranCodal 390591.
DOCUMENTS = {
    "agm_1403_dps_30": {
        "url": "https://codal.ir/DownloadFile.aspx?ft=1005&hs=5Wo3QKfOOObOOOKbPJKdmPwLDPfg%3D%3D&let=21",
        "discovery": "https://t.me/s/Codal360_ir?before=279201",
        "declaredDpsRial": 30,
        "tracingNoFromRepublication": "1304830",
    },
    "agm_1404_corrected_dps_80": {
        "url": "https://www.codal.ir/DownloadFile.aspx?hs=ABPH8LdAUBh4bbE5xTOOObOOO9tA%3d%3d&ft=1005&let=20",
        "discovery": "https://t.me/s/NoavaranCodal/390591",
        "declaredDpsRial": 80,
        "tracingNoFromRepublication": None,
    },
}
MAX_SIZE = 12 * 1024 * 1024
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"


def allowed_origin(url):
    parsed = urllib.parse.urlparse(url)
    return parsed.scheme == "https" and (
        parsed.hostname == "codal.ir" or parsed.hostname.endswith(".codal.ir")
    )


class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        if not allowed_origin(newurl):
            raise ValueError("redirect outside HTTPS CODAL origin")
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def check_document(raw):
    if not raw or len(raw) > MAX_SIZE:
        raise ValueError("empty or oversize CODAL response")
    head = raw[:8192].lower()
    blocked = (b"access denied", b"general error detected", b"captcha",
               b"cloudflare", b"403 forbidden", b"404 not found")
    if any(marker in head for marker in blocked):
        raise ValueError("error or access-denied content, not documentary evidence")
    if raw.startswith(b"%PDF-"):
        return "application/pdf"
    if b"<html" in head[:1024] or b"<!doctype html" in head[:1024]:
        # CODAL decisions may render HTML; this is only raw capture, not validation
        return "text/html; review-required"
    raise ValueError("unrecognized response: not a PDF or reviewable HTML")


def collect(directory, opener=None):
    opener = opener or urllib.request.build_opener(RestrictedRedirect())
    dest = pathlib.Path(directory).resolve()
    dest.mkdir(parents=True, exist_ok=True, mode=0o700)
    utc = dt.datetime.now(dt.timezone.utc).isoformat()
    report = {
        "instrument": "وساخت", "insCode": "25514780181345713",
        "isin": "IRO1SAKH0007", "capturedAtUtc": utc,
        "sourceAuthenticated": False, "issuerOriginalVerified": False,
        "historyBasisAuthenticated": False, "day3FinalAccepted": False,
        "entryEligible": False, "tradingSignalsEnabled": False,
        "kind": "CODAL_ORIGINAL_URL_RAW_BYTES_REVIEW_ONLY",
        "results": {},
    }
    for name, info in DOCUMENTS.items():
        item = {"sourceURL": info["url"], "discoveryURL": info["discovery"],
                "republicationDpsRial": info["declaredDpsRial"],
                "republicationTracingNo": info["tracingNoFromRepublication"],
                "status": "FAILED"}
        try:
            request = urllib.request.Request(info["url"], headers={
                "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.5",
                "User-Agent": USER_AGENT,
            })
            with opener.open(request, timeout=25) as response:
                if response.status != 200:
                    raise ValueError("HTTP status not 200")
                resolved = response.geturl()
                if not allowed_origin(resolved):
                    raise ValueError("response URL not CODAL HTTPS origin")
                raw = response.read(MAX_SIZE + 1)
                typ = check_document(raw)
                filename = name + (".pdf" if typ == "application/pdf" else ".html")
                (dest / filename).write_bytes(raw)
                item.update(status="RAW_CAPTURED_FOR_INDEPENDENT_REVIEW",
                            responseURL=resolved, contentTypeObserved=response.headers.get("Content-Type", ""),
                            formatChecked=typ, filename=filename,
                            sizeBytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        except Exception as exc:
            # Do not log entire remote response or local account paths.
            item["reason"] = type(exc).__name__ + ": " + str(exc)[:180]
        report["results"][name] = item
    (dest / "codal-source-manifest.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", help="Private local folder for raw CODAL source files")
    args = parser.parse_args()
    result = collect(args.directory)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if all(x["status"] == "RAW_CAPTURED_FOR_INDEPENDENT_REVIEW"
                    for x in result["results"].values()) else 2


if __name__ == "__main__":
    raise SystemExit(main())
