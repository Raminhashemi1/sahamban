import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/day3_cross_symbol_event_audit.py"
spec = importlib.util.spec_from_file_location("cross_symbol_audit", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
INS = "12345678901234567"

def daily(day, amount):
    return {"dEven": day, "insCode": INS, "pClosing": amount}

def event(day, before, after):
    return {"dEven": day, "insCode": INS,
            "pClosingNotAdjusted": before, "pClosing": after}

class TestCrossSymbolAudit(unittest.TestCase):
    def setUp(self):
        self.days = [daily(20260105, 90), daily(20260104, 100),
                     daily(20260103, 105)]

    def test_exact_reference(self):
        report = mod.audit(self.days, [event(20260105, 100, 90)], INS)
        self.assertEqual((report["exact"], report["mismatched"]), (1, 0))
        self.assertFalse(report["financialAcceptance"])
        self.assertFalse(report["tradingSignalsEnabled"])

    def test_four_rial_mismatch_is_not_waived(self):
        report = mod.audit(self.days, [event(20260105, 104, 90)], INS)
        self.assertEqual(report["events"][0]["differenceRial"], "4")
        self.assertEqual(report["events"][0]["comparison"],
                         "MISMATCH_REVIEW_REQUIRED")

    def test_missing_predecessor_fails_closed(self):
        report = mod.audit(self.days, [event(20260103, 105, 100)], INS)
        self.assertEqual(report["missingReference"], 1)

    def test_reject_wrong_instrument(self):
        with self.assertRaisesRegex(ValueError, "instrument"):
            mod.audit(self.days, [dict(event(20260105, 100, 90),
                                       insCode="999999999")], INS)

    def test_reject_repeated_dates(self):
        with self.assertRaisesRegex(ValueError, "unique"):
            mod.audit([self.days[0], self.days[0]], [], INS)

    def test_reject_negative_price(self):
        with self.assertRaisesRegex(ValueError, "Nonpositive"):
            mod.audit(self.days, [event(20260105, -1, 90)], INS)

if __name__ == "__main__":
    unittest.main()
