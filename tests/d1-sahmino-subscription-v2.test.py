import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
BASE = (ROOT / "server" / "d1-schema.sql").read_text(encoding="utf-8")
V1 = (ROOT / "server" / "d1-prepaid-migration.sql").read_text(encoding="utf-8")
V2 = (ROOT / "server" / "d1-sahmino-subscription-v2.sql").read_text(encoding="utf-8")

class SahminoV2MigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(BASE)
        self.db.executescript(V1)
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u1','2026-11-12T10:00:00Z')")
        self.db.execute("""INSERT INTO prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('legacy','u1','SAHAMBAN_PRO_3M',4500000,'IRR','CANCELLED','2026-11-12T10:00:00Z')""")
        self.db.executescript(V2)

    def tearDown(self):
        self.db.close()

    def test_five_exact_plan_price_pairs_are_accepted(self):
        pairs = [
            ("SAHMINO_PRO_30D", 1500000),
            ("SAHMINO_PRO_60D", 2850000),
            ("SAHMINO_PRO_90D", 4050000),
            ("SAHMINO_PRO_180D", 7650000),
            ("SAHMINO_PRO_365D", 14600000),
        ]
        for index, (plan, amount) in enumerate(pairs):
            self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at)
                VALUES(?,?,?,?,?,'PENDING','2026-11-12T10:00:00Z')""",
                (f"new{index}", "u1", plan, amount, "IRR"))
            self.db.execute("UPDATE sahmino_prepaid_subscription_orders SET state='CANCELLED' WHERE id=?", (f"new{index}",))
        self.assertEqual(self.db.execute(
            "SELECT count(*) FROM sahmino_prepaid_subscription_orders").fetchone()[0], 5)

    def test_wrong_price_and_legacy_plan_cannot_be_sold_in_v2(self):
        invalid = [
            ("SAHMINO_PRO_30D", 1),
            ("SAHMINO_PRO_60D", 1500000),
            ("SAHAMBAN_PRO_3M", 4500000),
            ("UNKNOWN", 100),
        ]
        for index, (plan, amount) in enumerate(invalid):
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
                    (id,user_id,plan_id,amount_rial,currency,state,created_at)
                    VALUES(?,?,?,?,?,'PENDING','2026-11-12T10:00:00Z')""",
                    (f"bad{index}", "u1", plan, amount, "IRR"))

    def test_v1_legacy_history_is_preserved_and_v2_pending_order_is_unique(self):
        self.assertEqual(self.db.execute(
            "SELECT plan_id,amount_rial FROM prepaid_subscription_orders WHERE id='legacy'"
        ).fetchone(), ("SAHAMBAN_PRO_3M", 4500000))
        self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('p1','u1','SAHMINO_PRO_30D',1500000,'IRR','PENDING','2026-11-12T10:00:00Z')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at)
                VALUES('p2','u1','SAHMINO_PRO_60D',2850000,'IRR','PENDING','2026-11-12T10:01:00Z')""")
        self.db.execute("UPDATE sahmino_prepaid_subscription_orders SET state='CANCELLED' WHERE id='p1'")
        self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('p3','u1','SAHMINO_PRO_60D',2850000,'IRR','PENDING','2026-11-12T10:02:00Z')""")

    def test_settled_v2_order_requires_provider_ids_and_event_deduplication(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at,settled_at)
                VALUES('badsettle','u1','SAHMINO_PRO_30D',1500000,'IRR','SETTLED',
                '2026-11-12T10:00:00Z','2026-11-12T10:01:00Z')""")
        self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at,settled_at,provider_name,provider_payment_id)
            VALUES('settled','u1','SAHMINO_PRO_30D',1500000,'IRR','SETTLED',
            '2026-11-12T10:00:00Z','2026-11-12T10:01:00Z','psp','pay1')""")
        self.db.execute("""INSERT INTO sahmino_prepaid_payment_events
            (provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
            VALUES('psp','evt1','pay1','settled','PAYMENT_SETTLED','2026-11-12T10:01:00Z')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_prepaid_payment_events
                (provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
                VALUES('psp','evt1','pay2','settled','PAYMENT_SETTLED','2026-11-12T10:02:00Z')""")

if __name__ == "__main__":
    unittest.main()
