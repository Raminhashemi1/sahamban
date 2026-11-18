import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "server" / "d1-sahmino-sms-otp.sql"

class SahminoSmsOtpMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
            CREATE TABLE sahamban_users (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE'
            );
            INSERT INTO sahamban_users(id,created_at) VALUES ('u1','2026-11-17T00:00:00Z');
        """)
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.db.close()

    def test_migration_is_additive_and_creates_phone_and_challenge_tables(self):
        names = {row[0] for row in self.db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn("sahamban_users", names)
        self.assertIn("sahmino_phone_identities", names)
        self.assertIn("sahmino_sms_otp_challenges", names)

    def test_verified_iranian_phone_is_unique_and_account_bound(self):
        self.db.execute("""INSERT INTO sahmino_phone_identities
            (id,user_id,phone_e164,verified_at,created_at)
            VALUES ('p1','u1','+989123456789','2026-11-17T00:00:00Z','2026-11-17T00:00:00Z')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_phone_identities
                (id,user_id,phone_e164,verified_at,created_at)
                VALUES ('p2','u1','+989123456789','2026-11-17T00:00:00Z','2026-11-17T00:00:00Z')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_phone_identities
                (id,user_id,phone_e164,verified_at,created_at)
                VALUES ('p3','missing','+989123456780','2026-11-17T00:00:00Z','2026-11-17T00:00:00Z')""")

    def test_challenge_accepts_only_iranian_e164_and_caps_attempts_at_five(self):
        base = ('c1','+989123456789','a'*64,'2026-11-17T00:00:00Z',
                '2026-11-17T00:02:00Z',0,5,'PENDING')
        self.db.execute("""INSERT INTO sahmino_sms_otp_challenges
            (id,phone_e164,verifier_hmac,created_at,expires_at,attempts,max_attempts,send_state)
            VALUES (?,?,?,?,?,?,?,?)""", base)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_sms_otp_challenges
                (id,phone_e164,verifier_hmac,created_at,expires_at,attempts,max_attempts,send_state)
                VALUES ('c2','+12025550123',?,'2026-11-17T00:00:00Z','2026-11-17T00:02:00Z',0,5,'PENDING')""", ('b'*64,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_sms_otp_challenges
                (id,phone_e164,verifier_hmac,created_at,expires_at,attempts,max_attempts,send_state)
                VALUES ('c3','+989123456780',?,'2026-11-17T00:00:00Z','2026-11-17T00:02:00Z',6,5,'PENDING')""", ('c'*64,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_sms_otp_challenges
                (id,phone_e164,verifier_hmac,created_at,expires_at,attempts,max_attempts,send_state)
                VALUES ('c4','+989123456780',?,'2026-11-17T00:00:00Z','2026-11-17T00:02:00Z',0,4,'PENDING')""", ('d'*64,))

    def test_challenge_has_no_plaintext_otp_column(self):
        columns = {row[1] for row in self.db.execute(
            "PRAGMA table_info(sahmino_sms_otp_challenges)")}
        self.assertIn("verifier_hmac", columns)
        self.assertNotIn("otp", columns)
        self.assertNotIn("code", columns)

if __name__ == "__main__":
    unittest.main()
