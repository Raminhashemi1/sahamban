import unittest
from datetime import date, timedelta
from scripts.day3_event_rounding_audit import INS_CODE, audit


def row(d, close, trades=0):
    return {'dEven': d, 'insCode': INS_CODE, 'pClosing': close, 'zTotTran': trades}


def event(d, before, after):
    return {'dEven': d, 'insCode': INS_CODE, 'pClosingNotAdjusted': before, 'pClosing': after}


class PriceGridAuditTests(unittest.TestCase):
    def sample(self):
        center = date(2021, 1, 19)
        preceding = [row(int((center-timedelta(days=i)).strftime('%Y%m%d')), 60750, 1)
                     for i in range(1, 26)]
        return ([row(20210120, 59910), row(20210119, 60750)] + preceding,
                [event(20210119, 60754, 59910)])

    def test_narrow_2021_rounding_compatibility(self):
        daily, events = self.sample()
        result = audit(daily, events)
        self.assertEqual(result['exactMatches'], 0)
        self.assertEqual(result['roundingCompatibleNotAttested'], 1)
        self.assertEqual(result['unexplainedNumericCount'], 0)
        self.assertEqual(result['events'][0]['differenceRial'], '4')
        self.assertFalse(result['day3FinalAccepted'])

    def test_wrong_following_price_blocks_classification(self):
        daily, events = self.sample()
        daily[0]['pClosing'] = 59920
        self.assertEqual(audit(daily, events)['unexplainedNumericCount'], 1)

    def test_non_grid_traded_close_blocks_classification(self):
        daily, events = self.sample()
        daily[-1]['pClosing'] = 60751
        self.assertEqual(audit(daily, events)['unexplainedNumericCount'], 1)

    def test_tampered_pre_adjustment_price_blocks_classification(self):
        daily, events = self.sample()
        events[0]['pClosingNotAdjusted'] = 60756
        self.assertEqual(audit(daily, events)['unexplainedNumericCount'], 1)

    def test_trading_on_event_date_blocks_classification(self):
        daily, events = self.sample()
        daily[1]['zTotTran'] = 1
        self.assertEqual(audit(daily, events)['unexplainedNumericCount'], 1)

    def test_exact_unrelated_event_not_subject_to_rounding_waiver(self):
        daily, events = self.sample()
        events[0] = event(20210119, 60750, 59910)
        self.assertEqual(audit(daily, events)['exactMatches'], 1)
        events[0] = event(20210119, 60753, 59910)
        self.assertEqual(audit(daily, events)['unexplainedNumericCount'], 1)

    def test_duplicate_event_rejected(self):
        daily, events = self.sample()
        with self.assertRaises(ValueError):
            audit(daily, events * 2)

    def test_wrong_instrument_rejected(self):
        daily, events = self.sample()
        events[0]['insCode'] = '123'
        with self.assertRaises(ValueError):
            audit(daily, events)

    def test_invalid_calendar_rejected(self):
        daily, events = self.sample()
        events[0]['dEven'] = 20210132
        with self.assertRaises(ValueError):
            audit(daily, events)

    def test_nonfinite_price_rejected(self):
        daily, events = self.sample()
        events[0]['pClosing'] = float('nan')
        with self.assertRaises(ValueError):
            audit(daily, events)


if __name__ == '__main__':
    unittest.main()
