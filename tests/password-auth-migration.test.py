import sqlite3, pathlib

db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
db.executescript("""
CREATE TABLE sahamban_users(
 id TEXT PRIMARY KEY,email_normalized TEXT UNIQUE,auth_subject TEXT UNIQUE,
 created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE'
 CHECK(status IN ('ACTIVE','SUSPENDED','CLOSED'))
);
CREATE TABLE sahmino_phone_identities(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sahamban_users(id),
 phone_e164 TEXT NOT NULL UNIQUE,verified_at TEXT NOT NULL,created_at TEXT NOT NULL,revoked_at TEXT,
 UNIQUE(id,user_id)
);
INSERT INTO sahamban_users(id,created_at,status) VALUES('usr_existing','2026-01-01T00:00:00.000Z','ACTIVE');
INSERT INTO sahmino_phone_identities(id,user_id,phone_e164,verified_at,created_at)
 VALUES('phn_1','usr_existing','+989123456789','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
""")
db.executescript(pathlib.Path('server/migrations/0004-username-password-auth.sql').read_text())
row=db.execute("SELECT username_normalized,password_salt,password_hash,password_iterations FROM sahamban_users WHERE id='usr_existing'").fetchone()
assert row==('+989123456789',None,None,None),row
assert db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sahmino_shared_sessions'").fetchone()
assert db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sahmino_auth_rate_limits'").fetchone()
db.execute("""INSERT INTO sahamban_users(id,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
 VALUES('usr_new','2026-01-02T00:00:00.000Z','ACTIVE','+989111111111',?, ?,310000)""",('a'*32,'b'*64))
try:
 db.execute("""INSERT INTO sahamban_users(id,created_at,status,username_normalized)
 VALUES('usr_dup','2026-01-02T00:00:00.000Z','ACTIVE','+989123456789')""")
 raise AssertionError('duplicate username accepted')
except sqlite3.IntegrityError: pass
for username,salt,digest,iterations in [
 ('not-a-phone',None,None,None),
 ('+989222222222','a'*32,None,310000),
 ('+989333333333','z'*32,'b'*64,310000),
 ('+989444444444','a'*32,'b'*64,999),
]:
 try:
  db.execute("""INSERT INTO sahamban_users(id,created_at,status,username_normalized,password_salt,password_hash,password_iterations)
   VALUES(?,?,?,?,?,?,?)""",('usr_invalid_'+str(len(username)+len(str(iterations))), '2026-01-02T00:00:00.000Z','ACTIVE',username,salt,digest,iterations))
  raise AssertionError('invalid auth fields accepted: '+username)
 except sqlite3.IntegrityError: pass
print('username/password migration tests passed')
