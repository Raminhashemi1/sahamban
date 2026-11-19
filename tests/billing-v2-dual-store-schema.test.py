import pathlib
import sqlite3
import tomllib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = (ROOT / "server/billing/schema.sql").read_text()
MIGRATION = (ROOT / "server/billing/migrations/0002-myket-store-columns.sql").read_text()

def base_db():
    db = sqlite3.connect(":memory:")
    db.execute("""CREATE TABLE sahamban_users (
        id TEXT PRIMARY KEY, auth_subject TEXT UNIQUE, status TEXT NOT NULL
    )""")
    db.execute("INSERT INTO sahamban_users VALUES ('u1','subject-1','ACTIVE')")
    return db

def check_shared_schema(db):
    cols = {row[1] for row in db.execute("PRAGMA table_info(billing_orders)")}
    assert {"store", "store_product_id", "store_order_id"} <= cols
    db.execute("""INSERT INTO billing_orders
        (id,user_id,plan_id,status,store,store_product_id,created_at)
        VALUES ('bazaar-1','u1','SAHAMBAN_PRO_30D','CREATED','BAZAAR','bazaar30','2026-01-01T00:00:00.000Z')""")
    db.execute("""INSERT INTO billing_orders
        (id,user_id,plan_id,status,store,store_product_id,created_at)
        VALUES ('myket-1','u1','SAHAMBAN_PRO_60D','CREATED','MYKET','myket60','2026-01-01T00:00:00.000Z')""")
    db.execute("UPDATE billing_orders SET store_order_id='myket-order-1' WHERE id='myket-1'")
    try:
        db.execute("UPDATE billing_orders SET store_order_id='myket-order-1' WHERE id='bazaar-1'")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("store_order_id uniqueness was not enforced")

def test_fresh_schema_supports_both_stores_in_one_ledger():
    db = base_db()
    db.executescript(SCHEMA)
    check_shared_schema(db)

def test_existing_bazaar_schema_can_be_migrated_once():
    db = base_db()
    db.executescript("""
    CREATE TABLE billing_orders(
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sahamban_users(id),
      plan_id TEXT NOT NULL CHECK(plan_id IN ('SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D')),
      status TEXT NOT NULL CHECK(status IN ('CREATED','PAID','CANCELLED','REVERSED')),
      created_at TEXT NOT NULL,paid_at TEXT,bazaar_product_id TEXT,bazaar_order_id TEXT,purchase_token_hash TEXT,
      UNIQUE(bazaar_order_id),UNIQUE(purchase_token_hash)
    );
    CREATE TABLE billing_access(user_id TEXT PRIMARY KEY,expires_at TEXT NOT NULL,auto_renewing INTEGER NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE billing_events(event_id TEXT PRIMARY KEY,order_id TEXT NOT NULL,event_type TEXT NOT NULL,created_at TEXT NOT NULL);
    """)
    db.execute("""INSERT INTO billing_orders(id,user_id,plan_id,status,created_at)
      VALUES ('legacy-1','u1','SAHAMBAN_PRO_30D','CREATED','2026-01-01T00:00:00.000Z')""")
    db.executescript(MIGRATION)
    row = db.execute("SELECT store,store_product_id FROM billing_orders WHERE id='legacy-1'").fetchone()
    assert row == ("BAZAAR", None)
    check_shared_schema(db)

def test_worker_templates_select_distinct_stores_and_share_one_database():
    bazaar = tomllib.loads((ROOT / "server/wrangler.bazaar.toml.example").read_text())
    myket = tomllib.loads((ROOT / "server/wrangler.myket.toml.example").read_text())
    assert bazaar["vars"]["BILLING_STORE"] == "BAZAAR"
    assert myket["vars"]["BILLING_STORE"] == "MYKET"
    assert bazaar["d1_databases"][0]["binding"] == myket["d1_databases"][0]["binding"] == "SAHAMBAN_DB"
    assert bazaar["d1_databases"][0]["database_id"] == myket["d1_databases"][0]["database_id"]
    assert bazaar["vars"]["BILLING_V2_ENABLED"] == myket["vars"]["BILLING_V2_ENABLED"] == "false"

if __name__ == "__main__":
    test_fresh_schema_supports_both_stores_in_one_ledger()
    test_existing_bazaar_schema_can_be_migrated_once()
    test_worker_templates_select_distinct_stores_and_share_one_database()
    print("dual-store billing schema, migration, and Worker templates: PASS")
