#!/usr/bin/env python3
"""Read-only, exact-byte Vesakht adjustment event price-grid audit.

A display-grid-compatible difference is not independent source authentication.
Do not rewrite original prices or enable financial decisions based on this file.
"""
import argparse
import hashlib
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

INS_CODE = '25514780181345713'
FULL_SHA256 = 'df85d417371d476edf1637f2e03ccae9df7518e02d37b8076442189e047b8247'
EVENT_SHA256 = '9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd'


def numeric(value):
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        raise ValueError('Invalid numeric value')
    result = Decimal(str(value))
    if not result.is_finite() or result <= 0:
        raise ValueError('Nonpositive or nonfinite price')
    return result


def source_date(value):
    if type(value) is not int or len(str(value)) != 8:
        raise ValueError('Invalid source date')
    value = str(value)
    return date(int(value[:4]), int(value[4:6]), int(value[6:]))


def verified_json(path, expected_hash, root):
    data = Path(path).read_bytes()
    if hashlib.sha256(data).hexdigest() != expected_hash:
        raise ValueError('Source SHA256 mismatch: ' + root)
    rows = json.loads(data, parse_float=Decimal)[root]
    if not isinstance(rows, list) or not rows:
        raise ValueError('Invalid source series')
    return rows


def audit(daily, events):
    dates = [source_date(row['dEven']) for row in daily]
    if dates != sorted(set(dates), reverse=True):
        raise ValueError('Unsorted or repeated daily date')
    by_date = {row['dEven']: i for i, row in enumerate(daily)}
    for row in daily:
        if str(row['insCode']) != INS_CODE:
            raise ValueError('Wrong daily instrument')
        numeric(row['pClosing'])
    seen = set()
    results = []
    for event in events:
        key = event['dEven']
        source_date(key)
        if key in seen or str(event['insCode']) != INS_CODE:
            raise ValueError('Duplicate event or wrong instrument')
        seen.add(key)
        i = by_date.get(key)
        if i is None or i == len(daily) - 1:
            raise ValueError('Event missing preceding daily record')
        pre = numeric(event['pClosingNotAdjusted'])
        post = numeric(event['pClosing'])
        prior = numeric(daily[i+1]['pClosing'])
        diff = pre - prior
        exact = diff == 0
        active = [numeric(row['pClosing']) for row, d in zip(daily, dates)
                  if abs((d - date(2021, 1, 19)).days) <= 45
                  and isinstance(row.get('zTotTran'), (int, float, Decimal))
                  and not isinstance(row.get('zTotTran'), bool)
                  and row['zTotTran'] > 0]
        grid = (key == 20210119 and diff == Decimal(4)
                and len(active) >= 20 and all(p % 10 == 0 for p in active)
                and prior % 10 == 0 and post % 10 == 0
                and (pre / 10).quantize(Decimal(1)) * 10 == prior
                and daily[i].get('zTotTran') == 0 and i > 0
                and numeric(daily[i-1]['pClosing']) == post)
        classification = ('EXACT_PRE_EVENT_REFERENCE' if exact else
                          'ROUNDING_COMPATIBLE_NOT_ATTESTED' if grid else
                          'UNEXPLAINED_DIFFERENCE')
        results.append({'date': str(key), 'before': str(pre), 'after': str(post),
                        'precedingDate': str(daily[i+1]['dEven']), 'precedingClose': str(prior),
                        'differenceRial': str(diff), 'classification': classification,
                        'contemporaneousActiveSessions': len(active) if grid else 0})
    return {'instrument': INS_CODE, 'dailyCount': len(daily), 'eventCount': len(results),
            'exactMatches': sum(r['classification'] == 'EXACT_PRE_EVENT_REFERENCE' for r in results),
            'roundingCompatibleNotAttested': sum(r['classification'] == 'ROUNDING_COMPATIBLE_NOT_ATTESTED' for r in results),
            'unexplainedNumericCount': sum(r['classification'] == 'UNEXPLAINED_DIFFERENCE' for r in results),
            'events': results, 'financialSourceAttested': False,
            'historyBasisAuthenticated': False, 'threeModesVerified': False,
            'day3FinalAccepted': False, 'entryEligible': False,
            'tradingSignalsEnabled': False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--daily', required=True)
    parser.add_argument('--adjustments', required=True)
    parser.add_argument('--output', required=True)
    opts = parser.parse_args()
    daily = verified_json(opts.daily, FULL_SHA256, 'closingPriceDaily')
    events = verified_json(opts.adjustments, EVENT_SHA256, 'priceAdjust')
    report = audit(daily, events)
    Path(opts.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('EXACT', report['exactMatches'], 'ROUNDING_COMPATIBLE',
          report['roundingCompatibleNotAttested'], 'UNEXPLAINED',
          report['unexplainedNumericCount'], 'DAY3_ACCEPTED', report['day3FinalAccepted'])


if __name__ == '__main__':
    main()
