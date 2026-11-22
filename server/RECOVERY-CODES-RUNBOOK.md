# Sahmino one-time password recovery codes

## Policy

Sahmino password recovery uses owner-issued one-time recovery codes. SMS, email reset links, support overrides, and account enumeration are not part of this flow.

- Provisioning creates 10 independently random 96-bit codes.
- Codes are shown once by the offline provisioning helper. The database stores only SHA-256 digests.
- Each code is single-use. A successful reset consumes the selected code, replaces the password, and revokes every active shared session in one D1 batch.
- Invalid, expired-by-rotation, or already-used codes produce the same generic recovery failure.
- Recovery requests share the username/IP rate-limit buckets used by login.
- The reset endpoint accepts requests only from the exact configured PWA origin.
- Re-running provisioning for an existing account changes its password, revokes all active shared sessions, and rotates its entire recovery-code set. All previous codes are invalidated.

## Provisioning procedure

1. Identify the intended internal D1 user ID from an authorized account lookup. Do not guess or derive it from the phone number.
2. Prepare a short-lived local JSON input file containing `username`, `password`, and (for an existing account) `userId`. Keep it outside the repository and restrict file permissions.
3. Run `node scripts/provision-sahmino-user.mjs < credentials.json > provision-result.json`. The password is read from stdin and is not printed.
4. Securely inspect `provision-result.json`. It contains:
   - `sql`: guarded D1 statements that set the password and replace the recovery-code digests;
   - `recoveryCodes`: ten plaintext codes, displayed only by this provisioning run.
5. Extract the SQL field to a separate temporary file and execute it against the specifically selected D1 database only after confirming the account and environment. Do not paste credentials or codes into shell arguments, chat, tickets, CI logs, or source control.
6. Deliver the ten codes to the account owner through a secure channel and require them to store them offline in a password manager or another protected location. Never retain a second copy after delivery.
7. Confirm that exactly one account row was updated (existing user) or inserted (new user), and that ten recovery-code rows exist for that user. Remove temporary plaintext input, result, and SQL files securely.

Do not run this procedure against production until the owner explicitly authorizes the target database and deployment. The application and billing feature flags remain disabled by default.

## User recovery flow

1. The user selects **بازیابی رمز عبور با کد یک‌بارمصرف** on the native login screen.
2. They enter their Iranian mobile username, one unused recovery code, and a new password of 12–128 characters.
3. The Worker validates the exact PWA origin and rate limit, hashes the code, then atomically consumes it and changes the password.
4. All existing sessions are revoked. The user signs in again using the new password.
5. If a code has already been used or was replaced during provisioning, the user must use another unused code.

## Operational constraints

- There is no endpoint to list or retrieve recovery codes.
- The database never stores plaintext recovery codes or passwords.
- Codes are not automatically emailed, texted, or displayed inside the application after provisioning.
- If all ten codes are lost or consumed, an authorized operator must verify account ownership and perform a new controlled provisioning/rotation. That action also changes the password and revokes sessions.
