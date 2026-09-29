# API

Base path `/api/v1`. JSON only. Swagger UI at `/api/docs` is the full, generated contract; this file records the rules and the endpoints built so far.

## Conventions

* Every route needs `Authorization: Bearer <accessToken>`, except `GET /health` and the public `/auth/*` routes.
* Errors always have this shape:

  ```json
  { "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": [{ "field": "email", "message": "email must be an email" }] }
  ```

* `400` validation (unknown body fields are rejected too), `401` missing/invalid/expired token, `403` wrong role, `404` not found, `409` conflict, `429` rate limited, `503` Supabase unreachable.
* The user is always taken from the verified token. `user_id`, `role` and scores sent by the client are never used.
* Backend messages are English. The frontend translates network, rate-limit and generic errors, and the messages listed below.

## Session

`POST /auth/login`, `/auth/verify-email` and `/auth/refresh` return:

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<opaque>",
  "expiresAt": 1790000000,
  "user": { "id": "uuid", "email": "learner@example.com", "emailVerified": true }
}
```

* `expiresAt` is Unix epoch seconds. Access tokens live 1 hour.
* Refresh tokens rotate: each works once; `/auth/refresh` returns a new one.

## Auth endpoints

All `/auth/*` endpoints are rate limited per IP and per endpoint: `AUTH_RATE_LIMIT` requests per minute (default 5), then `429` with `Retry-After`.

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, displayName }` | `201 { message }` | `400` validation |
| POST | `/auth/verify-email` | public | `{ tokenHash, type: "email" \| "signup" }` | `200` session | `400 Verification link is invalid or has expired` |
| POST | `/auth/resend-verification` | public | `{ email }` | `200 { message }`, always | `400` invalid email |
| POST | `/auth/login` | public | `{ email, password }` | `200` session | `401 Invalid email or password`; `403 Email not verified` |
| POST | `/auth/refresh` | public | `{ refreshToken }` | `200` session | `401 Invalid or expired refresh token` |
| POST | `/auth/logout` | JWT | — | `204` | `401` |
| POST | `/auth/forgot-password` | public | `{ email }` | `200 { message }`, always | `400` invalid email |
| POST | `/auth/reset-password` | public | `{ tokenHash, newPassword }` | `200 { message }` | `400 Reset link is invalid or has expired`; `400` with `details[newPassword]` (same as old, policy) |
| POST | `/auth/change-password` | JWT | `{ currentPassword, newPassword }` | `200 { message }` | `400` with `details[currentPassword]` (wrong) or `details[newPassword]` |

Rules:

* Password policy: 8–72 characters (72 is the bcrypt limit). Login does not apply the policy, so a short password gets the same `401` as a wrong one.
* Emails are trimmed and lower-cased.
* No user enumeration: register, resend and forgot-password answer the same for known and unknown emails. Login returns one generic `401`. `403 Email not verified` is only reachable with the correct password.
* Register sends the email with `emailRedirectTo = FRONTEND_URL/auth/verify`; forgot-password with `FRONTEND_URL/auth/reset-password`.
* Logout revokes the current session only (other devices stay signed in). The access token itself stays valid until it expires (≤ 1 h), because it is verified locally.
* Reset password signs out every session of the user. Change password keeps the current session.
* A wrong current password is `400`, not `401`: `401` means "your session is invalid" and makes the frontend sign you out.

## Profile

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/me` | — | `200` profile | `401`; `404` profile row missing |
| PATCH | `/me` | `{ displayName?, experienceLevel?, learningGoals? }` | `200` profile | `400` validation or protected field (`role`, `id`, `email`, …) |

```json
{
  "id": "uuid",
  "email": "learner@example.com",
  "displayName": "Minh",
  "experienceLevel": "some_qa",
  "learningGoals": ["Write better bug reports"],
  "role": "learner",
  "createdAt": "2026-09-29T05:00:00.000Z",
  "updatedAt": "2026-09-29T05:00:00.000Z"
}
```

* `displayName`: 1–80 characters after trimming.
* `experienceLevel`: `beginner` | `some_qa` | `working_qa` | `automation_qa` | `null` (clears it).
* `learningGoals`: up to 10 strings of up to 200 characters; blanks are dropped.
* An empty body returns the current profile.
* `role` cannot be changed by any API. Change it in the database (SQL editor): `update profiles set role = 'admin' where id = '…';`

## Health

`GET /health` (public) → `200 { status: "ok", timestamp, uptimeSeconds }`.
