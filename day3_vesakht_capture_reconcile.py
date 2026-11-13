#!/usr/bin/env python3
"""Reconstruct audited *bounded* TSETMC price bases from captured source bytes.
This script is numerical evidence only, never independent market-source or Codal
attestation. Fail closed on unclassified corporate actions and altered source.
"""
import argparse
import hashlib
import json
from datetime import date
from decimal import Decimal, ROUND_HALF_EVEN, getcontext
from pathlib import Path

getcontext().prec = 38
INSTRUMENT = '25514780181345713'
EXPECTED_SHA = {
    'closingPriceDaily': 'c974e81430cbf58240d0b89018bdadfd60fd352bf78299f8d2e396634d7dece3',
    'priceAdjust': '9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd',
}
FIELDS = ('priceFirst', 'priceMax', 'priceMin', 'pClosing', 'priceYesterday', 'pDrCotVal')
TWO_DEC = {'priceFirst', 'pClosing', 'pDrCotVal'}
# Cross-checked against secondary company-action summaries; NOT Codal-primary.
DIVIDENDS = {'20250202': Decimal('30'), '20260120': Decimal('80')}

def ingest(path, field):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA[field]:
        raise ValueError(field + ': captured byte SHA256 mismatch')
    obj = json.loads(raw, parse_float=Decimal)
    rows = obj[field]
    if not isinstance(rows, list) or not rows:
        raise ValueError(field + ': invalid or empty payload')
    return rows

def D(x):
    if x is None or isinstance(x, bool) or not isinstance(x, (int, float, Decimal)):
        raise ValueError('Invalid price')
    value = Decimal(str(x))
    if not value.is_finite():
        raise ValueError('Non-finite price')
    return value

def valid_date(value):
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError('Invalid source date')
    label = str(value)
    if len(label) != 8:
        raise ValueError('Invalid source date')
    try:
        date(int(label[:4]), int(label[4:6]), int(label[6:]))
    except ValueError as exc:
        raise ValueError('Invalid source date') from exc
    return label

def quantize(field, amount):
    q = Decimal('.01') if field in TWO_DEC else Decimal('1')
    return format(amount.quantize(q, rounding=ROUND_HALF_EVEN), 'f')

def reconcile(daily_path, adjustment_path):
    days = ingest(daily_path, 'closingPriceDaily')
    events = ingest(adjustment_path, 'priceAdjust')
    if (len(days), len(events)) != (500, 15):
        raise ValueError('Unexpected source-row counts')
    dates = [valid_date(d['dEven']) for d in days]
    if dates != sorted(set(dates), reverse=True):
        raise ValueError('Duplicate or unsorted daily sessions')
    for row in days:
        if str(row['insCode']) != INSTRUMENT or D(row['pClosing']) <= 0:
            raise ValueError('Mismatched instrument or daily close')
        for name in FIELDS:
            if D(row[name]) < 0:
                raise ValueError('Negative daily price field')
    relevant = []
    seen_event_dates = set()
    for event in events:
        if str(event['insCode']) != INSTRUMENT:
            raise ValueError('Mismatched adjustment instrument')
        day = valid_date(event['dEven'])
        if day in seen_event_dates:
            raise ValueError('Duplicate adjustment event date')
        seen_event_dates.add(day)
        before, after = D(event['pClosingNotAdjusted']), D(event['pClosing'])
        if before <= 0 or after <= 0:
            raise ValueError('Invalid adjustment price')
        if dates[-1] <= day <= dates[0]:
            if day not in dates:
                raise ValueError('Event day missing in source history')
            if D(days[dates.index(day)]['pClosing']) != before:
                raise ValueError('Event and daily source disagreement')
            if day not in DIVIDENDS or before - after != DIVIDENDS[day]:
                raise ValueError('Corporate action unclassified or dividend discrepancy')
            relevant.append({'date': day, 'ratio': after / before})
    if {x['date'] for x in relevant} != set(DIVIDENDS):
        raise ValueError('In-window events not fully classified')
    output = []
    for row in days:
        day = str(row['dEven'])
        factors = [e for e in relevant if day <= e['date']]
        factor = Decimal(1)
        for event in factors:
            factor *= event['ratio']
        raw = {name: str(D(row[name])) for name in FIELDS}
        adjusted = {name: quantize(name, D(row[name]) * factor) for name in FIELDS}
        conditional_capital_only = {name: quantize(name, D(row[name])) for name in FIELDS}
        output.append({'date': day, 'raw0': raw, 'computed1': adjusted,
                       'conditional2': conditional_capital_only,
                       'event_dates': [x['date'] for x in factors]})
    return {
        'instrument': INSTRUMENT,
        'scope': {'from': dates[-1], 'through': dates[0], 'rows': 500,
                  'fullHistoryVerified': False},
        'sourceHashes': EXPECTED_SHA,
        'method': 'decimal_HALF_EVEN_six_price_fields',
        'mode0': 'ORIGINAL_CAPTURE',
        'mode1': 'INDEPENDENT_NUMERIC_CALCULATION_NOT_UPSTREAM_OUTPUT',
        'mode2': 'SECONDARY_DIVIDEND_CLASSIFICATION_CONDITIONAL',
        'primaryCodalVerified': False,
        'threeModesIndependentlyCaptured': False,
        'historyBasisAuthenticated': False,
        'day3FinalAccepted': False,
        'tradingSignalsEnabled': False,
        'rows': output,
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--daily', required=True)
    parser.add_argument('--adjustments', required=True)
    parser.add_argument('--output', required=True)
    options = parser.parse_args()
    evidence = reconcile(options.daily, options.adjustments)
    output = Path(options.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('RECONCILED', len(evidence['rows']), 'raw sessions')
    print('OUTPUT_SHA256', hashlib.sha256(output.read_bytes()).hexdigest())
    print('DAY3_ACCEPTED', evidence['day3FinalAccepted'])
