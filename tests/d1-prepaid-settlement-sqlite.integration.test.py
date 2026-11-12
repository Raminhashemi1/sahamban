"""Integration tests for the actual provider-independent prepaid settlement SQL.

Offline SQLite, fake users and receipts. No live banking, worker or D1 mutation.
"""
from pathlib import Path
import re
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'server' / 'prepaid-settlement.cjs').read_text(encoding='utf-8')

def actual_sql(name):
    tick = chr(96)
    match = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*' + tick +
                      r'([^' + tick + r']*)' + tick + r';', SOURCE, re.S)
    if not match:
        raise AssertionError('Missing settlement SQL: ' + name)
    return match.group(1)

EVENT = actual_sql('EVENT_SQL')
ORDER = actual_sql('ORDER_SQL')
ENTITLEMENT = actual_sql('ENTITLEMENT_UPSERT_SQL')
NOW = '2026-11-12T10:00:00.000Z'
ORDER_ID = 'ord_' + 'a' * 32

def make_db():
    db = sqlite3.connect(':memory:')
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript((ROOT / 'server' / 'd1-schema.sql').read_text(encoding='utf-8'))
    db.executescript((ROOT / 'server' / 'd1-prepaid-migration.sql').read_text(encoding='utf-8'))
    db.execute('INSERT INTO sahamban_users(id,auth_subject,created_at,status) VALUES(?,?,?,?)',
               ('u1', 'integration:subject', NOW, 'ACTIVE'))
    return db

def pending(db, oid=ORDER_ID, plan='SAHAMBAN_PRO_3M', amount=4500000):
    db.execute('INSERT INTO prepaid_subscription_orders(id,user_id,plan_id,amount_rial,currency,state,created_at) VALUES(?,?,?,?,?,?,?)',
               (oid, 'u1', plan, amount, 'IRR', 'PENDING', NOW))
    db.commit()

def settle(db, oid=ORDER_ID, plan='SAHAMBAN_PRO_3M', amount=4500000, months=3,
           now=NOW, event='evt_1', payment='pay_1'):
    # Emulate D1 batch's all-or-nothing transaction on stock SQLite.
    with db:
        event_result = db.execute(EVENT, ('provider', event, payment, now, oid, plan, amount))
        order_result = db.execute(ORDER, (now, 'provider', payment, oid, plan, amount,
                                          'provider', event, payment))
        db.execute(ENTITLEMENT, (now, now, oid, 'provider', payment, months, months, now))
        if event_result.rowcount != 1 or order_result.rowcount != 1:
            raise AssertionError('Settlement did not update exact ledger and order')
    return db.execute('SELECT paid_until FROM prepaid_subscription_entitlements WHERE user_id=?',
                      ('u1',)).fetchone()[0]

class PrepaidSQLiteIntegration(unittest.TestCase):
    def test_calendar_clamp_from_january_31(self):
        db = make_db()
        try:
            pending(db)
            self.assertEqual(settle(db, now='2026-01-31T10:00:00.000Z'),
                             '2026-04-30T10:00:00.000Z')
            self.assertEqual(db.execute('SELECT state FROM prepaid_subscription_orders').fetchone()[0],
                             'SETTLED')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM prepaid_payment_events').fetchone()[0], 1)
        finally:
            db.close()

    def test_early_renewal_adds_full_period(self):
        db = make_db()
        try:
            pending(db)
            self.assertEqual(settle(db), '2027-02-12T10:00:00.000Z')
            second = 'ord_' + 'b' * 32
            pending(db, second, 'SAHAMBAN_PRO_6M', 8550000)
            self.assertEqual(settle(db, oid=second, plan='SAHAMBAN_PRO_6M',
                                    amount=8550000, months=6, event='evt_2',
                                    payment='pay_2'), '2027-08-12T10:00:00.000Z')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM prepaid_payment_events').fetchone()[0], 2)
        finally:
            db.close()

    def test_reused_provider_event_rolls_back(self):
        db = make_db()
        try:
            pending(db)
            settle(db)
            second = 'ord_' + 'b' * 32
            pending(db, second)
            with self.assertRaises(sqlite3.IntegrityError):
                settle(db, oid=second, payment='pay_2')  # same provider event
            self.assertEqual(db.execute('SELECT state FROM prepaid_subscription_orders WHERE id=?',
                                        (second,)).fetchone()[0], 'PENDING')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM prepaid_payment_events').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT paid_until FROM prepaid_subscription_entitlements').fetchone()[0],
                             '2027-02-12T10:00:00.000Z')
        finally:
            db.close()

    def test_grant_failure_rolls_back_order_and_event(self):
        db = make_db()
        try:
            pending(db)
            db.execute("CREATE TRIGGER fail_grant BEFORE INSERT ON prepaid_subscription_entitlements BEGIN SELECT RAISE(ABORT,'GRANT_DENIED'); END")
            with self.assertRaises(sqlite3.IntegrityError):
                settle(db)
            self.assertEqual(db.execute('SELECT state FROM prepaid_subscription_orders').fetchone()[0],
                             'PENDING')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM prepaid_payment_events').fetchone()[0], 0)
        finally:
            db.close()

    def test_wrong_plan_price_cannot_be_persisted(self):
        db = make_db()
        try:
            with self.assertRaises(sqlite3.IntegrityError):
                pending(db, amount=1)
        finally:
            db.close()

if __name__ == '__main__':
    unittest.main()
