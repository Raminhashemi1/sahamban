import sqlite3
import unittest
from pathlib import Path

SCHEMA = (Path(__file__).parents[1] / "server" / "d1-schema.sql").read_text(encoding="utf-8")

class D1SchemaIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def seed_user_order(self):
        self.db.execute(
            "INSERT INTO sahamban_users(id,created_at) VALUES(?,?)",
            ("u1", "2026-11-05T08:00:00.000Z"),
        )
        self.db.execute(
            """INSERT INTO subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES(?,?,?,?,?,?,?)""",
            ("o1","u1","SAHAMBAN_PRO_ANNUAL",1500000,"IRR","PENDING","2026-11-05T08:01:00.000Z"),
        )

    def test_schema_executes_and_foreign_keys_are_enforced(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                """INSERT INTO subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at)
                VALUES('o-x','missing','SAHAMBAN_PRO_ANNUAL',1000,'IRR','PENDING','2026-11-05T08:00:00Z')"""
            )

    def test_invalid_price_plan_currency_and_state_are_rejected(self):
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u1','2026-11-05T08:00:00Z')")
        for values in [
            ("o1","u1","SAHAMBAN_PRO_ANNUAL",0,"IRR","PENDING","2026-11-05T08:00:00Z"),
            ("o2","u1","OTHER",1000,"IRR","PENDING","2026-11-05T08:00:00Z"),
            ("o3","u1","SAHAMBAN_PRO_ANNUAL",1000,"IRT","PENDING","2026-11-05T08:00:00Z"),
            ("o4","u1","SAHAMBAN_PRO_ANNUAL",1000,"IRR","PAID","2026-11-05T08:00:00Z"),
        ]:
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute(
                    """INSERT INTO subscription_orders
                    (id,user_id,plan_id,amount_rial,currency,state,created_at)
                    VALUES(?,?,?,?,?,?,?)""", values
                )

    def test_manual_reconciliation_requires_complete_admin_audit_when_verified(self):
        self.seed_user_order()
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                """INSERT INTO manual_bank_reconciliations
                (id,order_id,user_id,amount_rial,currency,state)
                VALUES('r1','o1','u1',1500000,'IRR','MANUALLY_VERIFIED')"""
            )
        self.db.execute(
            """INSERT INTO manual_bank_reconciliations
            (id,order_id,user_id,amount_rial,currency,state)
            VALUES('r2','o1','u1',1500000,'IRR','AWAITING_BANK_RECONCILIATION')"""
        )

    def test_bank_transaction_and_order_reconciliation_are_unique(self):
        self.seed_user_order()
        self.db.execute(
            """INSERT INTO manual_bank_reconciliations
            (id,order_id,user_id,amount_rial,currency,state,bank_transaction_id,bank_booked_at,verified_by,verified_at)
            VALUES('r1','o1','u1',1500000,'IRR','MANUALLY_VERIFIED','bank-1','2026-11-05T08:05:00Z','admin-1','2026-11-05T08:06:00Z')"""
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                """INSERT INTO manual_bank_reconciliations
                (id,order_id,user_id,amount_rial,currency,state,bank_transaction_id,bank_booked_at,verified_by,verified_at)
                VALUES('r2','o1','u1',1500000,'IRR','MANUALLY_VERIFIED','bank-2','2026-11-05T08:05:00Z','admin-1','2026-11-05T08:06:00Z')"""
            )
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u2','2026-11-05T08:00:00Z')")
        self.db.execute(
            """INSERT INTO subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('o2','u2','SAHAMBAN_PRO_ANNUAL',1500000,'IRR','PENDING','2026-11-05T08:01:00Z')"""
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                """INSERT INTO manual_bank_reconciliations
                (id,order_id,user_id,amount_rial,currency,state,bank_transaction_id,bank_booked_at,verified_by,verified_at)
                VALUES('r3','o2','u2',1500000,'IRR','MANUALLY_VERIFIED','bank-1','2026-11-05T08:05:00Z','admin-1','2026-11-05T08:06:00Z')"""
            )

    def test_one_pending_annual_order_per_user_is_enforced_by_database(self):
        self.seed_user_order()
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                """INSERT INTO subscription_orders
                (id,user_id,plan_id,amount_rial,currency,state,created_at)
                VALUES('o2','u1','SAHAMBAN_PRO_ANNUAL',1500000,'IRR','PENDING',
                '2026-11-05T08:02:00Z')"""
            )
        self.db.execute("UPDATE subscription_orders SET state='CANCELLED' WHERE id='o1'")
        self.db.execute(
            """INSERT INTO subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('o2','u1','SAHAMBAN_PRO_ANNUAL',1500000,'IRR','PENDING',
            '2026-11-05T08:03:00Z')"""
        )
        self.assertEqual(self.db.execute(
            "SELECT count(*) FROM subscription_orders WHERE user_id='u1' AND state='PENDING'"
        ).fetchone()[0],1)

    def test_reconciliation_cannot_reference_other_users_order_or_invent_amount(self):
        self.seed_user_order()
        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u2','2026-11-05T08:00:00Z')")
        for user_id, amount in [('u2',1500000), ('u1',1000000)]:
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute(
                    """INSERT INTO manual_bank_reconciliations
                    (id,order_id,user_id,amount_rial,currency,state)
                    VALUES(?,?,?,?,?,?)""",
                    ("r-"+user_id+"-"+str(amount),"o1",user_id,amount,"IRR","AWAITING_BANK_RECONCILIATION")
                )

    def test_payment_event_ids_are_unique_per_provider(self):
        self.seed_user_order()
        row=("e1","psp","event-1","pay-1","o1","PAYMENT_SETTLED","2026-11-05T08:06:00Z")
        self.db.execute(
            """INSERT INTO payment_event_ledger
            (id,provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
            VALUES(?,?,?,?,?,?,?)""", row
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                """INSERT INTO payment_event_ledger
                (id,provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
                VALUES(?,?,?,?,?,?,?)""",
                ("e2","psp","event-1","pay-2","o1","PAYMENT_SETTLED","2026-11-05T08:07:00Z")
            )

    def test_atomic_manual_payment_grant_and_duplicate_bank_credit_rollback(self):
        self.seed_user_order()
        self.db.commit()
        # This is a synthetic, verified-bank-record transaction; it does not
        # authenticate an admin or connect to a bank.
        self.db.execute("BEGIN")
        try:
            self.db.execute(
                """INSERT INTO manual_bank_reconciliations
                (id,order_id,user_id,amount_rial,currency,state,
                 bank_transaction_id,bank_booked_at,verified_by,verified_at)
                VALUES(?,?,?,?,?,?,?,?,?,?)""",
                ("r1","o1","u1",1500000,"IRR","MANUALLY_VERIFIED","bank-1",
                 "2026-11-05T08:05:00Z","admin-1","2026-11-05T08:06:00Z")
            )
            self.db.execute(
                """UPDATE subscription_orders SET state='SETTLED',
                settled_at='2026-11-05T08:05:00Z',provider_name='MANUAL_BANK',
                provider_payment_id='bank-1' WHERE id='o1' AND state='PENDING'"""
            )
            self.db.execute(
                """INSERT INTO payment_event_ledger
                (id,provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
                VALUES('evt1','MANUAL_BANK','bank-event-1','bank-1','o1','MANUAL_BANK_SETTLED',
                '2026-11-05T08:06:00Z')"""
            )
            self.db.execute(
                """INSERT INTO subscription_entitlements
                (user_id,paid_until,updated_at) VALUES
                ('u1','2027-11-05T08:05:00Z','2026-11-05T08:06:00Z')"""
            )
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.assertEqual(self.db.execute(
            "SELECT state FROM subscription_orders WHERE id='o1'"
        ).fetchone()[0], "SETTLED")
        self.assertEqual(self.db.execute(
            "SELECT paid_until FROM subscription_entitlements WHERE user_id='u1'"
        ).fetchone()[0], "2027-11-05T08:05:00Z")

        self.db.execute("INSERT INTO sahamban_users(id,created_at) VALUES('u2','2026-11-05T08:00:00Z')")
        self.db.execute(
            """INSERT INTO subscription_orders
            (id,user_id,plan_id,amount_rial,currency,state,created_at)
            VALUES('o2','u2','SAHAMBAN_PRO_ANNUAL',1500000,'IRR','PENDING',
            '2026-11-05T08:01:00Z')"""
        )
        self.db.commit()
        self.db.execute("BEGIN")
        try:
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute(
                    """INSERT INTO manual_bank_reconciliations
                    (id,order_id,user_id,amount_rial,currency,state,
                     bank_transaction_id,bank_booked_at,verified_by,verified_at)
                    VALUES('r2','o2','u2',1500000,'IRR','MANUALLY_VERIFIED',
                    'bank-1','2026-11-05T08:05:00Z','admin-1','2026-11-05T08:06:00Z')"""
                )
        finally:
            self.db.rollback()
        self.assertEqual(self.db.execute(
            "SELECT state FROM subscription_orders WHERE id='o2'"
        ).fetchone()[0], "PENDING")
        self.assertIsNone(self.db.execute(
            "SELECT paid_until FROM subscription_entitlements WHERE user_id='u2'"
        ).fetchone())

    def test_pro_authorization_query_is_scoped_to_verified_identity(self):
        self.db.execute(
            "INSERT INTO sahamban_users(id,auth_subject,created_at) VALUES(?,?,?)",
            ("u1","oidc|issuer:user-123","2026-11-05T08:00:00Z"),
        )
        self.db.execute(
            "INSERT INTO sahamban_users(id,auth_subject,created_at) VALUES(?,?,?)",
            ("u2","oidc|issuer:user-456","2026-11-05T08:00:00Z"),
        )
        self.db.execute(
            """INSERT INTO subscription_entitlements(user_id,paid_until,updated_at)
            VALUES('u1','2027-11-05T08:00:00Z','2026-11-05T08:00:00Z')"""
        )
        statement = """SELECT u.id AS user_id, u.status AS account_status,
            e.paid_until AS paid_until, e.suspended AS suspended,
            e.auto_renew_cancelled AS auto_renew_cancelled
            FROM sahamban_users u
            LEFT JOIN subscription_entitlements e ON e.user_id = u.id
            WHERE u.auth_subject = ? LIMIT 1"""
        first = self.db.execute(statement,("oidc|issuer:user-123",)).fetchone()
        self.assertEqual(first[0],"u1")
        self.assertEqual(first[2],"2027-11-05T08:00:00Z")
        other = self.db.execute(statement,("oidc|issuer:user-456",)).fetchone()
        self.assertEqual(other[0],"u2")
        self.assertIsNone(other[2])
        self.assertIsNone(self.db.execute(statement,("unknown",)).fetchone())

    def test_transaction_rolls_back_partial_payment_state(self):
        self.seed_user_order()
        self.db.commit()
        self.db.execute("BEGIN")
        self.db.execute(
            """INSERT INTO subscription_entitlements(user_id,paid_until,updated_at)
            VALUES('u1','2027-11-05T08:00:00Z','2026-11-05T08:06:00Z')"""
        )
        self.db.rollback()
        self.assertIsNone(self.db.execute(
            "SELECT paid_until FROM subscription_entitlements WHERE user_id='u1'"
        ).fetchone())

if __name__ == "__main__":
    unittest.main()
