"""Fail-closed unit tests for the committed Day 3 numerical engine.
Synthetic inputs test logic only; never replace the captured instrument bytes.
"""
import datetime
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
import day3_vesakht_capture_reconcile as m

class NumericalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.daily = Path(self.temp.name) / 'daily.json'
        self.actions = Path(self.temp.name) / 'actions.json'
        start=datetime.date(2024,10,15)
        end=datetime.date(2026,11,10)
        all_dates=[(start+datetime.timedelta(days=i)).strftime('%Y%m%d')
                   for i in range((end-start).days+1)]
        selected=set(all_dates[-499:]) | {'20250202', '20260120'}
        dates=sorted(selected,reverse=True)
        while len(dates)>500:
            dates.remove(next(x for x in reversed(dates) if x not in ('20250202','20260120')))
        self.assertEqual(len(dates),500)
        rows=[]
        for date in dates:
            close=1443 if date=='20250202' else 1185 if date=='20260120' else 2000
            fields={name:close for name in m.FIELDS}
            rows.append(dict(insCode=m.INSTRUMENT,dEven=int(date),**fields))
        events=[dict(insCode=int(m.INSTRUMENT),dEven=int(day),
                     pClosing=after,pClosingNotAdjusted=before)
                for day,before,after in [('20250202',1443,1413),('20260120',1185,1105)]]
        events.extend(dict(insCode=int(m.INSTRUMENT),dEven=20100101+i,
                           pClosing=100,pClosingNotAdjusted=110) for i in range(13))
        self.daily.write_text(json.dumps({'closingPriceDaily':rows}))
        self.actions.write_text(json.dumps({'priceAdjust':events}))
        self.sha_backup=m.EXPECTED_SHA.copy()
        m.EXPECTED_SHA['closingPriceDaily']=hashlib.sha256(self.daily.read_bytes()).hexdigest()
        m.EXPECTED_SHA['priceAdjust']=hashlib.sha256(self.actions.read_bytes()).hexdigest()
        self.addCleanup(lambda: m.EXPECTED_SHA.update(self.sha_backup))
    def test_expected_mode_columns_and_fail_closed(self):
        result=m.reconcile(self.daily,self.actions)
        self.assertEqual(len(result['rows']),500)
        self.assertFalse(result['day3FinalAccepted'])
        self.assertFalse(result['historyBasisAuthenticated'])
        self.assertEqual(next(r for r in result['rows'] if r['date']=='20260120')['computed1']['pClosing'],'1105.00')
        self.assertEqual(next(r for r in result['rows'] if r['date']=='20250202')['computed1']['pClosing'],'1317.61')
    def test_changed_daily_byte_fails(self):
        self.daily.write_bytes(self.daily.read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):
            m.reconcile(self.daily,self.actions)
    def test_changed_action_byte_fails(self):
        self.actions.write_bytes(self.actions.read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):
            m.reconcile(self.daily,self.actions)
    def test_changed_instrument_fails_even_if_rehashed(self):
        raw=self.daily.read_text().replace(m.INSTRUMENT,'99999999999999999',1)
        self.daily.write_text(raw)
        m.EXPECTED_SHA['closingPriceDaily']=hashlib.sha256(self.daily.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError,'Mismatched instrument'):
            m.reconcile(self.daily,self.actions)
    def test_unknown_corporate_event_fails_even_if_rehashed(self):
        obj=json.loads(self.actions.read_text())
        obj['priceAdjust'][0]['pClosing']=1412
        self.actions.write_text(json.dumps(obj))
        m.EXPECTED_SHA['priceAdjust']=hashlib.sha256(self.actions.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError,'unclassified or dividend'):
            m.reconcile(self.daily,self.actions)

if __name__=='__main__':
    unittest.main()
