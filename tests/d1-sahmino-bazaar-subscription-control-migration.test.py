import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
BASE = (ROOT / "server" / "d1-schema.sql").read_text(encoding="utf-8")
V1 = (ROOT / "server" / "d1-prepaid-migration.sql").read_text(encoding="utf-8")
V2 = (ROOT / "server" / "d1-sahmino-subscription-v2.sql").read_text(encoding="utf-8")
TOKEN = (ROOT / "server" / "d1-bazaar-token-vault-migration.sql").read_text(encoding="utf-8")
CONTROL = (ROOT / "server" / "d1-sahmino-bazaar-subscription-control-migration.sql").read_text(encoding="utf-8")
NOW = "2026-11-18T10:00:00.000Z"
UNTIL = "2026-12-18T10:00:00.000Z"

class BazaarSubscriptionControlMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(BASE)
        self.db.executescript(V1)
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u1',?)", (NOW,))
        self.db.executescript(V2)
        self.db.executescript(TOKEN)
        self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('ord_test','u1','SAHMINO_PRO_30D',1500000,'IRR','PENDING',?)""", (NOW,))
        self.db.executescript(CONTROL)

    def tearDown(self):
        self.db.close()

    def insert_control(self, **overrides):
        values = {
            "order_id": "ord_test", "user_id": "u1", "provider_payment_id": "p" * 64,
            "renewal_mode": "MANUAL", "consent_version": None, "consent_at": None,
            "provider_auto_renewing": 0, "lifecycle_state": "VERIFIED",
            "provider_paid_until": UNTIL, "cancellation_requested_at": None,
            "cancellation_confirmed_at": None, "created_at": NOW, "updated_at": NOW,
        }
        values.update(overrides)
        columns = ",".join(values)
        marks = ",".join("?" for _ in values)
        self.db.execute(f"INSERT INTO sahmino_bazaar_subscription_control ({columns}) VALUES ({marks})",
                        tuple(values.values()))

    def test_manual_default_needs_no_consent_record(self):
        self.insert_control()
        row = self.db.execute("SELECT renewal_mode,consent_at,lifecycle_state FROM sahmino_bazaar_subscription_control").fetchone()
        self.assertEqual(row, ("MANUAL", None, "VERIFIED"))

    def test_auto_renew_requires_explicit_versioned_consent(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_control(renewal_mode="AUTO", provider_auto_renewing=1, lifecycle_state="RENEWAL_ACTIVE")
        self.insert_control(renewal_mode="AUTO", consent_version="sahmino-auto-renew-v1",
                            consent_at=NOW, provider_auto_renewing=1, lifecycle_state="RENEWAL_ACTIVE")
        self.assertEqual(self.db.execute("SELECT count(*) FROM sahmino_bazaar_subscription_control").fetchone()[0], 1)

    def test_manual_mode_cannot_reuse_auto_renew_consent(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_control(consent_version="sahmino-auto-renew-v1", consent_at=NOW)

    def test_cancellation_is_not_confirmed_by_request_alone(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_control(lifecycle_state="CANCELLED")
        self.insert_control(lifecycle_state="CANCELLATION_PENDING", provider_auto_renewing=1,
                            cancellation_requested_at=NOW)
        state = self.db.execute("SELECT lifecycle_state,cancellation_confirmed_at,provider_paid_until FROM sahmino_bazaar_subscription_control").fetchone()
        self.assertEqual(state, ("CANCELLATION_PENDING", None, UNTIL))

    def test_cancelled_state_requires_provider_confirmation_timestamp(self):
        self.insert_control(lifecycle_state="CANCELLED", cancellation_confirmed_at=NOW,
                            cancellation_requested_at=NOW, provider_auto_renewing=0)
        self.assertEqual(self.db.execute("SELECT cancellation_confirmed_at FROM sahmino_bazaar_subscription_control").fetchone()[0], NOW)

    def test_provider_payment_identity_is_unique(self):
        self.insert_control()
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_control(order_id="ord_test_2")

if __name__ == "__main__":
    unittest.main()
