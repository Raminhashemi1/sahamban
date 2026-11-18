import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
BASE = (ROOT / "server" / "d1-schema.sql").read_text(encoding="utf-8")
V1 = (ROOT / "server" / "d1-prepaid-migration.sql").read_text(encoding="utf-8")
V2 = (ROOT / "server" / "d1-sahmino-subscription-v2.sql").read_text(encoding="utf-8")
VAULT = (ROOT / "server" / "d1-bazaar-token-vault-migration.sql").read_text(encoding="utf-8")

class BazaarTokenVaultMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(BASE)
        self.db.executescript(V1)
        self.db.executescript(V2)

    def tearDown(self):
        self.db.close()

    def test_additive_migration_adds_nullable_envelope_fields(self):
        self.db.executescript(VAULT)
        columns = {row[1] for row in self.db.execute(
            "PRAGMA table_info(sahmino_prepaid_subscription_orders)"
        )}
        self.assertTrue({
            "provider_token_version", "provider_token_nonce",
            "provider_token_ciphertext"
        }.issubset(columns))

    def test_existing_orders_remain_compatible_and_null(self):
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u1','2026-11-18T00:00:00Z')")
        self.db.execute("""INSERT INTO sahmino_prepaid_subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('old','u1','SAHMINO_PRO_30D',1500000,'IRR','PENDING','2026-11-18T00:00:00Z')""")
        self.db.executescript(VAULT)
        row = self.db.execute("""SELECT provider_token_version,provider_token_nonce,
            provider_token_ciphertext FROM sahmino_prepaid_subscription_orders WHERE id='old'""").fetchone()
        self.assertEqual(row, (None, None, None))

if __name__ == "__main__":
    unittest.main()
