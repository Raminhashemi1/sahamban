import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "server" / "d1-schema.sql"
MIGRATION = ROOT / "server" / "d1-sahmino-password-auth.sql"

class PasswordAuthMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(BASE.read_text(encoding="utf-8"))
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.db.execute("INSERT INTO sahamban_users(id,created_at,status) VALUES ('usr_existing','2026-11-20T00:00:00Z','ACTIVE')")

    def tearDown(self):
        self.db.close()

    def test_additive_schema_preserves_billing_and_user_tables(self):
        tables = {r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for name in ("sahamban_users", "subscription_orders", "subscription_entitlements",
                     "sahmino_user_credentials", "sahmino_shared_sessions", "sahmino_auth_login_attempts"):
            self.assertIn(name, tables)

    def test_credential_is_unique_and_bound_to_active_existing_user(self):
        digest = "pbkdf2-sha256$600000$" + "a"*32 + "$" + "b"*64
        self.db.execute("""INSERT INTO sahmino_user_credentials
          (user_id,username_normalized,password_hash,created_at,updated_at)
          VALUES ('usr_existing','+989123456789',?,'2026-11-20T00:00:00Z','2026-11-20T00:00:00Z')""", (digest,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_user_credentials
              (user_id,username_normalized,password_hash,created_at,updated_at)
              VALUES ('usr_missing','otheruser',?,'2026-11-20T00:00:00Z','2026-11-20T00:00:00Z')""", (digest,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_user_credentials
              (user_id,username_normalized,password_hash,created_at,updated_at)
              VALUES ('usr_existing','otheruser',?,'2026-11-20T00:00:00Z','2026-11-20T00:00:00Z')""", (digest,))

    def test_rejects_weak_or_wrong_format_password_hash(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_user_credentials
              (user_id,username_normalized,password_hash,created_at,updated_at)
              VALUES ('usr_existing','+989123456789','plain-text','2026-11-20T00:00:00Z','2026-11-20T00:00:00Z')""")

    def test_login_attempt_rate_limits_are_pseudonymous_and_indexed(self):
        cols = {r[1] for r in self.db.execute("PRAGMA table_info(sahmino_auth_login_attempts)")}
        self.assertEqual(cols, {"id","ip_key_hmac","username_key_hmac","created_epoch"})
        self.assertNotIn("ip_address", cols)
        indexes = {r[1] for r in self.db.execute("PRAGMA index_list(sahmino_auth_login_attempts)")}
        self.assertIn("idx_sahmino_auth_login_ip", indexes)
        self.assertIn("idx_sahmino_auth_login_username", indexes)

    def test_sessions_store_only_hashes_and_are_revocable(self):
        self.db.execute("""INSERT INTO sahmino_shared_sessions
          (id,user_id,token_hash,created_at,expires_at,last_seen_at)
          VALUES ('s1','usr_existing',?,'2026-11-20T00:00:00Z','2026-12-20T00:00:00Z','2026-11-20T00:00:00Z')""", ("c"*64,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_shared_sessions
              (id,user_id,token_hash,created_at,expires_at,last_seen_at)
              VALUES ('s2','usr_existing',?,'2026-11-20T00:00:00Z','2026-12-20T00:00:00Z','2026-11-20T00:00:00Z')""", ("c"*64,))

if __name__ == "__main__":
    unittest.main()
