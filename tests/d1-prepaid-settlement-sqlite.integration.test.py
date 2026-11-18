"""Integration tests for actual Bazaar-expiry settlement SQL in offline SQLite.
No live banking, Worker deployment, merchant credentials or customer data.
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
CONTROL = actual_sql('CONTROL_INSERT_SQL')
NOW = '2026-11-12T10:00:00.000Z'
ORDER_ID = 'ord_' + 'a' * 32

def make_db():
    db = sqlite3.connect(':memory:')
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript((ROOT / 'server' / 'd1-schema.sql').read_text(encoding='utf-8'))
    db.executescript((ROOT / 'server' / 'd1-prepaid-migration.sql').read_text(encoding='utf-8'))
    db.executescript((ROOT / 'server' / 'd1-sahmino-subscription-v2.sql').read_text(encoding='utf-8'))
    db.executescript((ROOT / 'server' / 'd1-sahmino-renewal-consent-migration.sql').read_text(encoding='utf-8'))
    db.executescript((ROOT / 'server' / 'd1-bazaar-token-vault-migration.sql').read_text(encoding='utf-8'))
    db.executescript((ROOT / 'server' / 'd1-sahmino-bazaar-subscription-control-migration.sql').read_text(encoding='utf-8'))
    db.execute('INSERT INTO sahamban_users(id,auth_subject,created_at,status) VALUES(?,?,?,?)',
               ('u1', 'integration:subject', NOW, 'ACTIVE'))
    return db

def pending(db, oid=ORDER_ID, plan='SAHMINO_PRO_30D', amount=1500000, renewal='MANUAL', consent_version=None):
    db.execute('INSERT INTO sahmino_prepaid_subscription_orders(id,user_id,plan_id,amount_rial,currency,state,created_at,renewal_mode,renewal_consent_version,renewal_consent_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
               (oid, 'u1', plan, amount, 'IRR', 'PENDING', NOW, renewal, consent_version, NOW if renewal == 'AUTO' else None))
    db.commit()

def settle(db, oid=ORDER_ID, plan='SAHMINO_PRO_30D', amount=1500000,
           now=NOW, valid_until='2026-12-22T10:00:00.000Z',
           event='evt_1', payment='pay_1', provider_auto_renewing=0):
    with db:
        event_result = db.execute(EVENT, ('cafebazaar', event, payment, now, oid, plan, amount))
        order_result = db.execute(ORDER, (now, 'cafebazaar', payment, 'v1', 'test-nonce', 'test-ciphertext',
                                          oid, plan, amount, 'cafebazaar', event, payment))
        db.execute(ENTITLEMENT, (oid, 'cafebazaar', payment, valid_until, now))
        control_result = db.execute(CONTROL, (provider_auto_renewing, valid_until, now, now, oid, payment))
        control_changes = control_result.rowcount
        grant_changes = db.execute('SELECT changes()').fetchone()[0]
        if event_result.rowcount != 1 or order_result.rowcount != 1 or grant_changes != 1 or control_changes != 1:
            raise AssertionError('Settlement did not update event, order and entitlement atomically')
    return db.execute('SELECT paid_until FROM sahmino_prepaid_subscription_entitlements WHERE user_id=?',
                      ('u1',)).fetchone()[0]

class SahminoSQLiteIntegration(unittest.TestCase):
    def test_provider_expiry_is_stored_exactly_not_recomputed_from_plan_days(self):
        db = make_db()
        try:
            pending(db)
            provider_expiry = '2027-01-03T04:05:06.000Z'
            self.assertEqual(settle(db, valid_until=provider_expiry), provider_expiry)
            self.assertEqual(db.execute('SELECT state FROM sahmino_prepaid_subscription_orders').fetchone()[0], 'SETTLED')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_prepaid_payment_events').fetchone()[0], 1)
            control = db.execute('SELECT renewal_mode,provider_auto_renewing,lifecycle_state,provider_paid_until FROM sahmino_bazaar_subscription_control').fetchone()
            self.assertEqual(control, ('MANUAL', 0, 'VERIFIED', provider_expiry))
        finally:
            db.close()

    def test_auto_renewal_requires_order_consent_and_records_active_provider_state(self):
        db = make_db()
        try:
            pending(db, renewal='AUTO', consent_version='sahmino-auto-renew-v1')
            self.assertEqual(settle(db, provider_auto_renewing=1), '2026-12-22T10:00:00.000Z')
            control = db.execute('SELECT renewal_mode,consent_version,consent_at,provider_auto_renewing,lifecycle_state FROM sahmino_bazaar_subscription_control').fetchone()
            self.assertEqual(control, ('AUTO', 'sahmino-auto-renew-v1', NOW, 1, 'RENEWAL_ACTIVE'))
        finally:
            db.close()

    def test_manual_repurchase_never_shortens_existing_later_entitlement(self):
        db = make_db()
        try:
            pending(db)
            self.assertEqual(settle(db, valid_until='2026-12-22T10:00:00.000Z'),
                             '2026-12-22T10:00:00.000Z')
            second = 'ord_' + 'b' * 32
            pending(db, second, 'SAHMINO_PRO_60D', 2850000)
            self.assertEqual(settle(db, oid=second, plan='SAHMINO_PRO_60D',
                                    amount=2850000, valid_until='2027-02-10T10:00:00.000Z',
                                    event='evt_2', payment='pay_2'),
                             '2027-02-10T10:00:00.000Z')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_prepaid_payment_events').fetchone()[0], 2)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_bazaar_subscription_control').fetchone()[0], 2)
        finally:
            db.close()

    def test_reused_provider_event_rolls_back_all_rows(self):
        db = make_db()
        try:
            pending(db)
            settle(db)
            second = 'ord_' + 'b' * 32
            pending(db, second)
            with self.assertRaises(sqlite3.IntegrityError):
                settle(db, oid=second, payment='pay_2')
            self.assertEqual(db.execute('SELECT state FROM sahmino_prepaid_subscription_orders WHERE id=?', (second,)).fetchone()[0], 'PENDING')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_prepaid_payment_events').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_bazaar_subscription_control').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT paid_until FROM sahmino_prepaid_subscription_entitlements').fetchone()[0], '2026-12-22T10:00:00.000Z')
        finally:
            db.close()

    def test_entitlement_failure_rolls_back_order_and_event(self):
        db = make_db()
        try:
            pending(db)
            db.execute("CREATE TRIGGER fail_grant BEFORE INSERT ON sahmino_prepaid_subscription_entitlements BEGIN SELECT RAISE(ABORT,'GRANT_DENIED'); END")
            with self.assertRaises(sqlite3.IntegrityError):
                settle(db)
            self.assertEqual(db.execute('SELECT state FROM sahmino_prepaid_subscription_orders').fetchone()[0], 'PENDING')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_prepaid_payment_events').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sahmino_bazaar_subscription_control').fetchone()[0], 0)
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
