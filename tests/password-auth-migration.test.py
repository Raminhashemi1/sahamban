import sqlite3, pathlib, json, subprocess

root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
db.executescript((root/'server/d1-schema.sql').read_text())
db.executescript((root/'server/billing/schema.sql').read_text())
db.executescript("""
CREATE TABLE sahmino_phone_identities(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sahamban_users(id),
 phone_e164 TEXT NOT NULL UNIQUE,verified_at TEXT NOT NULL,created_at TEXT NOT NULL,revoked_at TEXT,
 UNIQUE(id,user_id)
);
INSERT INTO sahamban_users(id,created_at,status)
 VALUES('usr_existing','2026-01-01T00:00:00.000Z','ACTIVE');
INSERT INTO sahmino_phone_identities(id,user_id,phone_e164,verified_at,created_at)
 VALUES('phn_1','usr_existing','+989123456789','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
CREATE TABLE sahmino_shared_sessions(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sahamban_users(id),
 token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,
 last_seen_at TEXT NOT NULL,revoked_at TEXT
);
INSERT INTO sahmino_shared_sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at)
 VALUES('ses_legacy','usr_existing','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '2026-01-01T00:00:00.000Z','2099-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
""")
db.executescript((root/'server/migrations/0004-username-password-auth.sql').read_text())
db.executescript((root/'server/migrations/0005-password-recovery-codes.sql').read_text())
row=db.execute("""
 SELECT username_normalized,password_salt,password_hash,password_iterations
 FROM sahamban_users WHERE id='usr_existing'
""").fetchone()
assert row==('+989123456789',None,None,None),row
assert db.execute("""
 SELECT name FROM sqlite_master WHERE type='table' AND name='sahmino_shared_sessions'
""").fetchone()
assert db.execute("""
 SELECT name FROM sqlite_master WHERE type='table' AND name='sahmino_auth_rate_limits'
""").fetchone()
assert db.execute("""
 SELECT name FROM sqlite_master WHERE type='table' AND name='sahmino_recovery_codes'
""").fetchone()
assert db.execute("""
 SELECT revoked_at IS NOT NULL FROM sahmino_shared_sessions WHERE id='ses_legacy'
""").fetchone()==(1,)
db.execute("""
 INSERT INTO sahamban_users(id,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
 VALUES('usr_new','2026-01-02T00:00:00.000Z','ACTIVE','+989111111111',?, ?,310000)
""",('a'*32,'b'*64))
try:
 db.execute("""
  INSERT INTO sahamban_users(id,created_at,status,username_normalized)
  VALUES('usr_dup','2026-01-02T00:00:00.000Z','ACTIVE','+989123456789')
 """)
 raise AssertionError('duplicate username accepted')
except sqlite3.IntegrityError:
 pass
for index,(username,salt,digest,iterations) in enumerate([
 ('not-a-phone',None,None,None),
 ('+989222222222','a'*32,None,310000),
 ('+989333333333','z'*32,'b'*64,310000),
 ('+989444444444','a'*32,'b'*64,999),
]):
 try:
  db.execute("""
   INSERT INTO sahamban_users(id,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
   VALUES(?,?,?,?,?,?,?)
  """,(f'usr_invalid_{index}','2026-01-02T00:00:00.000Z','ACTIVE',username,salt,digest,iterations))
  raise AssertionError('invalid auth fields accepted: '+username)
 except sqlite3.IntegrityError:
  pass
for sql in [
 "UPDATE sahamban_users SET password_hash=NULL WHERE id='usr_new'",
 "UPDATE sahamban_users SET password_salt='z'*32 WHERE id='usr_new'",
]:
 try:
  db.execute(sql)
  raise AssertionError('invalid credential update accepted: '+sql)
 except sqlite3.IntegrityError:
  pass

# Operator-driven credential rotation must revoke existing sessions and replace
# the complete recovery-code set, not merely update the password.
db.execute("""
 INSERT INTO sahmino_shared_sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at)
 VALUES('ses_active','usr_existing',?,'2026-01-02T00:00:00.000Z',
        '2099-01-01T00:00:00.000Z','2026-01-02T00:00:00.000Z')
""",('c'*64,))
db.execute("""
 INSERT INTO sahmino_recovery_codes(id,user_id,code_hash,created_at)
 VALUES('rcv_old','usr_existing',?,'2026-01-01T00:00:00.000Z')
""",('d'*64,))
db.commit()
provision=subprocess.run(
 ['node',str(root/'scripts/provision-sahmino-user.mjs')],
 input=json.dumps({'userId':'usr_existing','username':'09123456789',
                   'password':'Provisioned secure password 2026!'}),
 text=True,capture_output=True,check=True,timeout=15
)
provisioned=json.loads(provision.stdout)
assert len(provisioned['recoveryCodes'])==10
db.executescript(provisioned['sql'])
assert db.execute("""
 SELECT revoked_at IS NOT NULL FROM sahmino_shared_sessions
 WHERE id='ses_active'
""").fetchone()==(1,)
assert db.execute("""
 SELECT count(*) FROM sahmino_recovery_codes WHERE user_id='usr_existing'
""").fetchone()==(10,)
assert db.execute("""
 SELECT count(*) FROM sahmino_recovery_codes
 WHERE user_id='usr_existing' AND code_hash=?
""",('d'*64,)).fetchone()==(0,)
assert db.execute("""
 SELECT password_hash IS NOT NULL AND password_salt IS NOT NULL
 FROM sahamban_users WHERE id='usr_existing'
""").fetchone()==(1,)

print('username/password migration and provisioning tests passed')
