import pathlib, sqlite3, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class RenewalConsentMigration(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.executescript((ROOT/'server/d1-sahmino-subscription-v2.sql').read_text())
  self.db.executescript("""
  CREATE TABLE sahamban_users(id TEXT PRIMARY KEY,status TEXT NOT NULL,auth_subject TEXT);
  INSERT INTO sahamban_users VALUES('usr_'||printf('%032d',1),'ACTIVE','subject');
  """)
  self.db.executescript((ROOT/'server/d1-sahmino-renewal-consent-migration.sql').read_text())
 def tearDown(self): self.db.close()
 def order(self,**extra):
  values={'id':'ord_'+'a'*32,'user_id':'usr_'+'0'*31+'1','plan_id':'SAHMINO_PRO_30D',
   'amount_rial':1500000,'currency':'IRR','state':'PENDING','created_at':'2026-11-18T10:00:00.000Z'}
  values.update(extra)
  cols=','.join(values);marks=','.join('?' for _ in values)
  self.db.execute(f"INSERT INTO sahmino_prepaid_subscription_orders({cols}) VALUES({marks})",tuple(values.values()))
 def test_existing_orders_default_to_manual(self):
  self.order()
  row=self.db.execute('SELECT renewal_mode,renewal_consent_version,renewal_consent_at FROM sahmino_prepaid_subscription_orders').fetchone()
  self.assertEqual(row,('MANUAL',None,None))
 def test_auto_requires_explicit_version_and_timestamp(self):
  self.order(renewal_mode='AUTO',renewal_consent_version='sahmino-auto-renew-v1',renewal_consent_at='2026-11-18T10:00:00.000Z')
  with self.assertRaises(sqlite3.IntegrityError):
   self.order(id='ord_'+'b'*32,renewal_mode='AUTO')
 def test_manual_rejects_attached_consent_and_invalid_modes(self):
  with self.assertRaises(sqlite3.IntegrityError):
   self.order(renewal_consent_version='sahmino-auto-v1')
  with self.assertRaises(sqlite3.IntegrityError):
   self.order(id='ord_'+'c'*32,renewal_mode='UNKNOWN')
if __name__=='__main__': unittest.main()
