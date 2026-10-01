Most APIs hold data that not everyone may see or change. Two questions protect it: **who are you?** (authentication) and **what are you allowed to do?** (authorization). Access-control bugs are among the most serious an API can have, because the UI hides nothing from someone who calls the API directly. A tester's job is to call it directly.

## Authentication vs authorization

| | Authentication (authn) | Authorization (authz) |
|---|---|---|
| Question | Who are you? | May you do this? |
| Checked with | Password, token, API key | Role, ownership, permissions |
| Fails with | `401 Unauthorized` | `403 Forbidden` (or `404`) |
| Example | No token, expired token | A learner calls an admin endpoint |

The name `401 Unauthorized` is historical and confusing: it really means *unauthenticated*.

## Bearer tokens and JWT

After login, the API gives the client an **access token**. The client sends it on every request:

```http
GET /api/v1/courses HTTP/1.1
Authorization: Bearer eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiI5YjF...
```

Many APIs use a **JWT** (JSON Web Token): three Base64 parts separated by dots: header, payload (claims such as `sub`, the user id, and `exp`, the expiry time) and a signature. The payload is only encoded, not encrypted: anyone can read it at jwt.io. The **signature** is what stops someone from changing it. Tests that follow from this:

* No `Authorization` header → `401`.
* `Bearer` with garbage, or a token with one character changed (broken signature) → `401`.
* An expired token → `401`. The client then refreshes or logs in again.
* A token from a logged-out session → `401` if the API revokes sessions.
* The token must never appear in the URL, in logs or in an error message.

Access tokens are short-lived. A **refresh token** gets a new one; if refresh tokens rotate, an old refresh token used a second time must be rejected.

## Authorization tests

Authentication proves identity; it does not decide access. For each endpoint ask: *which users may call it, on which data?*

**Roles.** Call admin endpoints with a learner token: the answer must be `403`, every time, for every method. Check before the data is touched: a `PATCH` that returns `403` but still saved the change is a bug.

**Ownership (other users' data).** This is the most common serious API bug, called **IDOR** (Insecure Direct Object Reference) or **BOLA** (Broken Object Level Authorization). The test needs **two accounts**:

1. User A creates something private (an order, an answer, a profile note) and notes its id.
2. User B, with **B's** token, calls `GET`, `PATCH` and `DELETE` on A's id.
3. Expected: `403` or `404`. Never `200` with A's data.

`404` is often the better answer: `403` confirms that the resource exists. The QA Learning Lab API answers `404` for content a learner may not see, whatever the reason.

**Trust nothing from the client.** The user id comes from the verified token, not from the body. Try sending `"userId"`, `"role": "admin"` or a `"score"` in a body: a secure API rejects the request (`400`) or ignores the field. It must never make you an admin or let you set your own score.

## What a good auth test plan covers

| Area | Test |
|---|---|
| Missing / invalid / expired token | `401` on every protected endpoint |
| Public endpoints | Work without a token (`GET /api/v1/health`, login) |
| Roles | Learner token on admin routes → `403` |
| Ownership | User B on user A's ids → `403` / `404` |
| Body fields | `role`, `userId`, `score` cannot be set by the client |
| Responses | No password hashes, tokens or other users' data |

## Try it yourself

In the QA Learning Lab API, every endpoint except `GET /api/v1/health` and the public `/auth/*` ones needs a Bearer token. In Swagger UI (`/api/docs`), call `GET /api/v1/courses` without authorizing, then with a valid token, then with the same token with its last character changed. You should see `401`, `200`, `401`.

> Key idea: `401` = we do not know who you are; `403` = we know, and no. Always test with two users: the most damaging bugs are one user reading or changing another user's data.
