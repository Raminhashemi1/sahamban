import pathlib
import re
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = (ROOT / "server" / "schema.sql").read_text()
SERVICE = (ROOT / "server" / "settlement-service.mjs").read_text()
QUERIES = re.findall(r"db\.prepare\(\`(.*?)\`\)", SERVICE, re.S)

class SettlementSqliteContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # The SQL below is extracted directly from the production JS service,
        # so these tests exercise the exact statements rather than a rewrite.
        if len(QUERIES) != 5:
            raise AssertionError(f"Expected 5 SQL statements, found {len(QUERIES)}")
        cls.order_lookup, cls.order_update, cls.event_insert, cls.access_upsert, cls.access_lookup = QUERIES

    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript(SCHEMA)
        self.db.execute("""
          INSERT INTO billing_orders
            (id,user_id,store,plan_id,status,amount_irr,store_product_id,created_at)
          VALUES ('order-1','user-1','BAZAAR','SAHAMBAN_PRO_30D','CREATED',
                  1500000,'bazaar-30d','2027-01-01T00:00:00.000Z')
        """)
        self.db.commit()
        self.now = "2027-01-01T00:00:00.000Z"
        self.token_hash = "a" * 64

    def tearDown(self):
        self.db.close()

    def run_batch(self, order_id="order-1", store_order_id="store-order-1",
                  token_hash=None, event_id="event-1"):
        token_hash = token_hash or self.token_hash
        self.db.execute("BEGIN")
        results = []
        try:
            results.append(self.db.execute(self.order_update, (
                store_order_id, token_hash, self.now,
                order_id, "user-1", "BAZAAR", "bazaar-30d", 1500000
            )).rowcount)
            results.append(self.db.execute(self.event_insert, (
                event_id, self.now, token_hash, order_id, "user-1",
                store_order_id, token_hash, self.now
            )).rowcount)
            results.append(self.db.execute(self.access_upsert, (
                self.now, self.now, self.now, order_id, "user-1", "BAZAAR",
                store_order_id, token_hash, self.now, event_id
            )).rowcount)
            self.last_expiry = self.db.execute(
                self.access_lookup, ("user-1",)
            ).fetchone()
            self.db.commit()
            return results
        except Exception:
            self.db.rollback()
            raise

    def test_verified_purchase_grants_exact_plan_duration(self):
        self.assertEqual(self.run_batch(), [1, 1, 1])
        row = self.db.execute(
            "SELECT expires_at FROM billing_access WHERE user_id='user-1'"
        ).fetchone()
        self.assertEqual(row[0], "2027-01-31T00:00:00.000Z")

    def test_replayed_order_cannot_extend_access_twice(self):
        self.assertEqual(self.run_batch(), [1, 1, 1])
        # The conditional CREATED -> PAID update no longer matches.
        # The event-gated entitlement write therefore has no source row.
        self.assertEqual(self.run_batch(event_id="event-2"), [0, 0, 0])
        row = self.db.execute(
            "SELECT expires_at FROM billing_access WHERE user_id='user-1'"
        ).fetchone()
        self.assertEqual(row[0], "2027-01-31T00:00:00.000Z")
        self.assertEqual(self.db.execute(
            "SELECT COUNT(*) FROM billing_events WHERE event_type='PURCHASE_VERIFIED'"
        ).fetchone()[0], 1)

    def test_two_requests_that_both_pre_read_created_only_grant_once(self):
        # Both callers can observe CREATED before either atomic batch starts.
        first_read = self.db.execute(
            "SELECT status FROM billing_orders WHERE id='order-1'"
        ).fetchone()[0]
        second_read = self.db.execute(
            "SELECT status FROM billing_orders WHERE id='order-1'"
        ).fetchone()[0]
        self.assertEqual((first_read, second_read), ("CREATED", "CREATED"))

        self.assertEqual(self.run_batch(event_id="event-1"), [1, 1, 1])
        # The second caller's stale pre-read cannot bypass the conditional UPDATE.
        self.assertEqual(self.run_batch(event_id="event-2"), [0, 0, 0])
        expiry = self.db.execute(
            "SELECT expires_at FROM billing_access WHERE user_id='user-1'"
        ).fetchone()[0]
        self.assertEqual(expiry, "2027-01-31T00:00:00.000Z")
        self.assertEqual(self.db.execute(
            "SELECT COUNT(*) FROM billing_events WHERE event_type='PURCHASE_VERIFIED'"
        ).fetchone()[0], 1)

    def test_early_renewal_extends_from_existing_expiry(self):
        self.db.execute(
            "INSERT INTO billing_access(user_id,expires_at,auto_renewing,updated_at) VALUES (?,?,0,?)",
            ("user-1", "2027-02-10T00:00:00.000Z", self.now)
        )
        self.db.commit()
        self.assertEqual(self.run_batch(), [1, 1, 1])
        row = self.db.execute(
            "SELECT expires_at FROM billing_access WHERE user_id='user-1'"
        ).fetchone()
        self.assertEqual(row[0], "2027-03-12T00:00:00.000Z")

    def test_duplicate_store_token_rolls_back_entire_batch(self):
        self.db.execute("""
          INSERT INTO billing_orders
            (id,user_id,store,plan_id,status,amount_irr,store_product_id,created_at)
          VALUES ('order-2','user-1','BAZAAR','SAHAMBAN_PRO_30D','CREATED',
                  1500000,'bazaar-30d','2027-01-01T00:00:00.000Z')
        """)
        self.db.commit()
        self.assertEqual(self.run_batch(), [1, 1, 1])
        with self.assertRaises(sqlite3.IntegrityError):
            self.run_batch(order_id="order-2", store_order_id="store-order-2",
                           event_id="event-2")
        status = self.db.execute(
            "SELECT status FROM billing_orders WHERE id='order-2'"
        ).fetchone()[0]
        self.assertEqual(status, "CREATED")
        self.assertEqual(self.db.execute(
            "SELECT COUNT(*) FROM billing_events WHERE event_type='PURCHASE_VERIFIED'"
        ).fetchone()[0], 1)


# Reversal contract tests execute the exact SQL from reversal-service.mjs.
REVERSAL_SERVICE = (ROOT / "server" / "reversal-service.mjs").read_text()
REVERSAL_QUERIES = re.findall(r"db\\.prepare\\(\\`(.*?)\\`\\)", REVERSAL_SERVICE, re.S)

class ReversalSqliteContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if len(REVERSAL_QUERIES) != 8:
            raise AssertionError(f"Expected 8 reversal SQL statements, found {len(REVERSAL_QUERIES)}")
        (cls.order_lookup, cls.prior_event_lookup, cls.access_lookup,
         cls.order_reverse, cls.event_insert, cls.access_delete,
         cls.access_rebuild, cls.final_access_lookup) = REVERSAL_QUERIES

    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript(SCHEMA)
        self.now = "2027-02-01T00:00:00.000Z"
        self.db.execute("""
          INSERT INTO billing_orders
            (id,user_id,store,plan_id,status,amount_irr,store_product_id,
             store_order_id,purchase_token_hash,created_at,paid_at)
          VALUES ('order-1','user-1','BAZAAR','SAHAMBAN_PRO_30D','PAID',
                  1500000,'sku-30','store-1',?,'2027-01-01T00:00:00.000Z',
                  '2027-01-01T00:00:00.000Z')
        """, ("a" * 64,))
        self.db.execute("""
          INSERT INTO billing_events(event_id,order_id,event_type,created_at,payload_hash)
          VALUES ('verified-1','order-1','PURCHASE_VERIFIED',?,'a')
        """, (self.now,))
        self.db.execute("""
          INSERT INTO billing_access(user_id,expires_at,auto_renewing,updated_at)
          VALUES ('user-1','2027-01-31T00:00:00.000Z',0,?)
        """, (self.now,))
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def add_purchase(self, order_id, store_order_id, token_hash, paid_at, plan='SAHAMBAN_PRO_30D'):
        self.db.execute("""
          INSERT INTO billing_orders
            (id,user_id,store,plan_id,status,amount_irr,store_product_id,
             store_order_id,purchase_token_hash,created_at,paid_at)
          VALUES (?,?, 'BAZAAR', ?, 'PAID', 1500000, 'sku-30', ?, ?, ?, ?)
        """, (order_id, 'user-1', plan, store_order_id, token_hash, paid_at, paid_at))
        self.db.execute("""
          INSERT INTO billing_events(event_id,order_id,event_type,created_at,payload_hash)
          VALUES (?,?, 'PURCHASE_VERIFIED', ?, ?)
        """, ('verified-' + order_id, order_id, self.now, token_hash))
        self.db.commit()

    def reverse(self, order_id='order-1', store_order_id='store-1',
                token_hash=None, event_id='reversal-1', provider_event='BAZAAR:refund-1'):
        token_hash = token_hash or ('a' * 64)
        self.db.execute("BEGIN")
        try:
            changed = self.db.execute(self.order_reverse, (
                order_id, 'user-1', 'BAZAAR', store_order_id, token_hash
            )).rowcount
            event_changes = self.db.execute(self.event_insert, (
                event_id, self.now, 'b' * 64, provider_event,
                order_id, 'user-1', 'BAZAAR', store_order_id, token_hash
            )).rowcount
            self.db.execute(self.access_delete, ('user-1', event_id, order_id))
            self.db.execute(self.access_rebuild, ('user-1', self.now, event_id, order_id))
            row = self.db.execute(self.final_access_lookup, ('user-1',)).fetchone()
            self.db.commit()
            return changed, event_changes, row[0] if row else None
        except Exception:
            self.db.rollback()
            raise

    def test_reversing_only_purchase_removes_entitlement(self):
        self.assertEqual(self.reverse(), (1, 1, None))
        status = self.db.execute(
            "SELECT status FROM billing_orders WHERE id='order-1'"
        ).fetchone()[0]
        self.assertEqual(status, 'REVERSED')

    def test_reversal_rebuilds_expiry_from_remaining_paid_orders(self):
        self.add_purchase('order-2', 'store-2', 'c' * 64, '2027-01-15T00:00:00.000Z')
        self.assertEqual(self.reverse(), (1, 1, '2027-02-14T00:00:00.000Z'))

    def test_out_of_order_reversal_preserves_only_unreversed_purchase(self):
        self.add_purchase('order-2', 'store-2', 'c' * 64, '2027-01-15T00:00:00.000Z')
        # Reverse the later purchase first; the earlier purchase remains effective.
        self.assertEqual(self.reverse(
            order_id='order-2', store_order_id='store-2', token_hash='c' * 64,
            event_id='reversal-2', provider_event='BAZAAR:refund-2'
        ), (1, 1, '2027-01-31T00:00:00.000Z'))

    def test_duplicate_reversal_is_blocked_by_unique_order_and_provider_event(self):
        self.assertEqual(self.reverse(), (1, 1, None))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""
              INSERT INTO billing_events(
                event_id,order_id,event_type,created_at,payload_hash,provider_event_id
              ) VALUES ('reversal-duplicate','order-1','PURCHASE_REVERSED',?,'x','BAZAAR:refund-1')
            """, (self.now,))

    def test_failed_reversal_rolls_back_order_and_entitlement(self):
        self.db.execute("BEGIN")
        self.db.execute(self.order_reverse, (
            'order-1', 'user-1', 'BAZAAR', 'store-1', 'a' * 64
        ))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(self.event_insert, (
                'reversal-1', self.now, 'b' * 64, 'BAZAAR:refund-1',
                'missing-order', 'user-1', 'BAZAAR', 'store-1', 'a' * 64
            ))
        self.db.rollback()
        status = self.db.execute(
            "SELECT status FROM billing_orders WHERE id='order-1'"
        ).fetchone()[0]
        expiry = self.db.execute(
            "SELECT expires_at FROM billing_access WHERE user_id='user-1'"
        ).fetchone()[0]
        self.assertEqual(status, 'PAID')
        self.assertEqual(expiry, '2027-01-31T00:00:00.000Z')

if __name__ == "__main__":
    unittest.main()
