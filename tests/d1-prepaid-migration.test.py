import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
BASE = (ROOT / "server" / "d1-schema.sql").read_text(encoding="utf-8")
MIGRATION = (ROOT / "server" / "d1-prepaid-migration.sql").read_text(encoding="utf-8")

class PrepaidD1MigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(BASE)
        self.db.executescript(MIGRATION)
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u1','2026-11-12T10:00:00Z')")

    def tearDown(self):
        self.db.close()

    def insert_order(self, order_id="o1", plan="SAHMINO_PRO_30D", price=1500000, state="PENDING"):
        self.db.execute("""INSERT INTO prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES(?,?,?,?,?,?,?)""",
            (order_id,"u1",plan,price,"IRR",state,"2026-11-12T10:00:00Z"))

    def test_migration_is_additive_and_leaves_legacy_annual_contract(self):
        self.assertEqual(
            self.db.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='subscription_orders'").fetchone()[0],
            1
        )
        self.insert_order()
        self.assertEqual(self.db.execute("SELECT plan_id FROM prepaid_subscription_orders").fetchone()[0],"SAHMINO_PRO_30D")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at)
                VALUES('legacy','u1','SAHAMBAN_PRO_3M',4500000,'IRR','PENDING','2026-11-12T10:00:00Z')""")

    def test_all_five_approved_plan_price_pairs_are_allowed(self):
        plans = [
            ("SAHMINO_PRO_30D",1500000),
            ("SAHMINO_PRO_60D",2850000),
            ("SAHMINO_PRO_90D",4050000),
            ("SAHMINO_PRO_180D",7650000),
            ("SAHMINO_PRO_365D",14600000),
        ]
        for index, (plan, price) in enumerate(plans):
            self.insert_order("valid"+str(index), plan, price)
        self.assertEqual(self.db.execute("SELECT count(*) FROM prepaid_subscription_orders").fetchone()[0],5)

    def test_wrong_plan_price_pairs_are_rejected(self):
        invalid = [
            ("SAHMINO_PRO_30D",1),
            ("SAHMINO_PRO_60D",1500000),
            ("SAHMINO_PRO_90D",2850000),
            ("SAHMINO_PRO_180D",4050000),
            ("SAHMINO_PRO_365D",7650000),
            ("UNKNOWN",1500000),
        ]
        for index, (plan, price) in enumerate(invalid):
            with self.assertRaises(sqlite3.IntegrityError):
                self.insert_order("invalid"+str(index), plan, price)

    def test_only_one_pending_order_per_account(self):
        self.insert_order()
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_order("o2","SAHMINO_PRO_60D",2850000)
        self.db.execute("UPDATE prepaid_subscription_orders SET state='CANCELLED' WHERE id='o1'")
        self.insert_order("o3","SAHMINO_PRO_60D",2850000)
        self.assertEqual(self.db.execute("SELECT count(*) FROM prepaid_subscription_orders WHERE user_id='u1' AND state='PENDING'").fetchone()[0],1)

    def test_settled_order_requires_provider_and_payment_identifiers(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO prepaid_subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at,settled_at)
                VALUES('bad','u1','SAHMINO_PRO_30D',1500000,'IRR','SETTLED','2026-11-12T10:00:00Z','2026-11-12T10:01:00Z')""")
        self.insert_order()
        self.db.execute("""UPDATE prepaid_subscription_orders SET state='SETTLED',
            settled_at='2026-11-12T10:01:00Z',provider_name='psp',provider_payment_id='pay1'
            WHERE id='o1'""")

    def test_provider_event_and_payment_ids_cannot_be_replayed(self):
        self.insert_order()
        self.db.execute("""INSERT INTO prepaid_payment_events
            (provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
            VALUES('psp','evt1','pay1','o1','PAYMENT_SETTLED','2026-11-12T10:01:00Z')""")
        for event_id,payment_id in [("evt1","pay2"),("evt2","pay1")]:
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute("""INSERT INTO prepaid_payment_events
                    (provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
                    VALUES('psp',?,?, 'o1','PAYMENT_SETTLED','2026-11-12T10:02:00Z')""",(event_id,payment_id))

if __name__ == "__main__":
    unittest.main()
