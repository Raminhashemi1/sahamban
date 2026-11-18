import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "server" / "d1-schema.sql"
OTP_SCHEMA = ROOT / "server" / "d1-sahmino-sms-otp.sql"
RUNTIME_SCHEMA = ROOT / "server" / "d1-sahmino-sms-otp-runtime.sql"

class SahminoD1OtpRepositorySchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(SCHEMA.read_text(encoding="utf-8"))
        self.db.executescript(OTP_SCHEMA.read_text(encoding="utf-8"))
        self.db.executescript(RUNTIME_SCHEMA.read_text(encoding="utf-8"))
        self.db.execute("INSERT INTO sahamban_users(id,created_at,status) VALUES ('u1','2026-11-17T00:00:00Z','ACTIVE')")

    def tearDown(self):
        self.db.close()

    def challenge(self, challenge_id='c1', state='ACCEPTED'):
        self.db.execute("""INSERT INTO sahmino_sms_otp_challenges
          (id,phone_e164,verifier_hmac,created_at,expires_at,attempts,max_attempts,send_state)
          VALUES (?,?,?,?,?,0,5,?)""",
          (challenge_id,'+989123456789','a'*64,'2026-11-17T12:00:00Z',
           '2026-11-17T12:02:00Z',state))

    def test_all_additive_tables_exist_without_replacing_legacy_user_or_subscription_tables(self):
        tables={r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for name in ('sahamban_users','subscription_orders','subscription_entitlements',
                     'sahmino_phone_identities','sahmino_sms_otp_challenges',
                     'sahmino_sms_otp_send_events','sahmino_shared_sessions'):
            self.assertIn(name,tables)

    def test_send_event_quotas_can_be_counted_by_phone_and_hmac_ip_only(self):
        self.db.execute("""INSERT INTO sahmino_sms_otp_send_events
          VALUES ('e1','+989123456789',?,'2026-11-17T12:00:00Z',1794916800)""",('b'*64,))
        row=self.db.execute("""SELECT COUNT(*) FROM sahmino_sms_otp_send_events
          WHERE phone_e164=? AND ip_key_hmac=?""",('+989123456789','b'*64)).fetchone()
        self.assertEqual(row[0],1)
        cols={r[1] for r in self.db.execute("PRAGMA table_info(sahmino_sms_otp_send_events)")}
        self.assertNotIn('ip_address',cols)

    def test_atomic_consume_is_single_use_and_checks_expiry_attempts_and_delivery(self):
        self.challenge()
        sql="""UPDATE sahmino_sms_otp_challenges SET consumed_at=?
          WHERE id=? AND verifier_hmac=? AND send_state='ACCEPTED'
            AND consumed_at IS NULL AND superseded_at IS NULL AND expires_at>?
            AND attempts<5 AND max_attempts=5"""
        first=self.db.execute(sql,('2026-11-17T12:00:30Z','c1','a'*64,'2026-11-17T12:00:30Z')).rowcount
        second=self.db.execute(sql,('2026-11-17T12:00:31Z','c1','a'*64,'2026-11-17T12:00:31Z')).rowcount
        self.assertEqual((first,second),(1,0))

    def test_expired_superseded_failed_or_locked_challenges_cannot_be_consumed(self):
        self.challenge('expired')
        self.challenge('superseded')
        self.challenge('failed','FAILED')
        self.challenge('locked')
        self.db.execute("UPDATE sahmino_sms_otp_challenges SET superseded_at=? WHERE id='superseded'",('2026-11-17T12:00:01Z',))
        self.db.execute("UPDATE sahmino_sms_otp_challenges SET attempts=5 WHERE id='locked'")
        sql="""UPDATE sahmino_sms_otp_challenges SET consumed_at=?
          WHERE id=? AND verifier_hmac=? AND send_state='ACCEPTED'
            AND consumed_at IS NULL AND superseded_at IS NULL AND expires_at>?
            AND attempts<5 AND max_attempts=5"""
        for cid,when in [('expired','2026-11-17T12:03:00Z'),('superseded','2026-11-17T12:00:30Z'),('failed','2026-11-17T12:00:30Z'),('locked','2026-11-17T12:00:30Z')]:
            changed=self.db.execute(sql,('2026-11-17T12:00:30Z',cid,'a'*64,when)).rowcount
            self.assertEqual(changed,0,cid)

    def test_phone_identity_is_unique_and_bound_to_existing_user(self):
        self.db.execute("""INSERT INTO sahmino_phone_identities
          (id,user_id,phone_e164,verified_at,created_at)
          VALUES ('p1','u1','+989123456789','2026-11-17T12:00:00Z','2026-11-17T12:00:00Z')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_phone_identities
              (id,user_id,phone_e164,verified_at,created_at)
              VALUES ('p2','missing','+989123456780','2026-11-17T12:00:00Z','2026-11-17T12:00:00Z')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_phone_identities
              (id,user_id,phone_e164,verified_at,created_at)
              VALUES ('p3','u1','+989123456789','2026-11-17T12:00:00Z','2026-11-17T12:00:00Z')""")

    def test_shared_session_stores_only_digest_and_is_revocable(self):
        self.db.execute("""INSERT INTO sahmino_shared_sessions
          (id,user_id,token_hash,created_at,expires_at,last_seen_at)
          VALUES ('s1','u1',?,'2026-11-17T12:00:00Z','2026-12-17T12:00:00Z','2026-11-17T12:00:00Z')""",('c'*64,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO sahmino_shared_sessions
              (id,user_id,token_hash,created_at,expires_at,last_seen_at)
              VALUES ('s2','u1',?,'2026-11-17T12:00:00Z','2026-12-17T12:00:00Z','2026-11-17T12:00:00Z')""",('c'*64,))
        self.db.execute("UPDATE sahmino_shared_sessions SET revoked_at=? WHERE id='s1'",('2026-11-17T12:01:00Z',))
        self.assertIsNotNone(self.db.execute("SELECT revoked_at FROM sahmino_shared_sessions WHERE id='s1'").fetchone()[0])

if __name__ == '__main__':
    unittest.main()
