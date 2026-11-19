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
                store_order_id, token_hash, self.now
            )).rowcount)
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
        # changes() gates prevent event insertion and entitlement extension.
        self.assertEqual(self.run_batch(event_id="event-2"), [0, 0, 0])
        row = self.db.execute(
            "SELECT expires_at FROM billing_access WHERE user_id='user-1'"
        ).fetchone()
        self.assertEqual(row[0], "2027-01-31T00:00:00.000Z")
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
        # A different order cannot reuse a purchase token already settled.
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

if __name__ == "__main__":
    unittest.main()
