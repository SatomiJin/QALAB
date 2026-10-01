A happy-path test proves the API works when everything is right. Real clients send wrong things too: old app versions, typos, scripts, attackers. **Negative tests** send invalid input on purpose; **boundary tests** probe the edges of every limit. Together they find most API bugs, and the API makes them cheap: no UI blocks you from sending `"age": "abc"`.

## What a good API does with bad input

1. Rejects it with a **4xx** status (usually `400`), never a `5xx`.
2. Explains it in a **consistent error shape**, naming the field.
3. **Changes nothing**: no half-created record, no partial update.
4. Reveals nothing internal: no stack trace, no SQL, no file paths.

The QA Learning Lab API, for example, always answers errors like this:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "slug", "message": "slug must match ^[a-z0-9]+(-[a-z0-9]+)*$" }]
}
```

A test asserts the status, the shape (`statusCode`, `error`, `message`, `details`) and that `details` names the right field.

## Negative test ideas

Take any endpoint with a body, say `POST /api/notes` with `title` (text, required, 1–100 characters) and `priority` (whole number 1–5), and try:

| Category | Example | Expected |
|---|---|---|
| Missing required field | `{}` or no `title` | `400`, `details` names `title` |
| Wrong type | `"priority": "high"`, `"title": 42` | `400` |
| `null` | `"title": null` | `400` |
| Empty or blank | `"title": ""`, `"title": "   "` | `400` (if blank is not allowed) |
| Unknown field | `"colour": "red"` | `400` in strict APIs (the QA Learning Lab API) or ignored |
| Protected field | `"id"`, `"userId"`, `"createdAt"` | `400` or ignored, never applied |
| Broken JSON | `{"title": "Buy milk",` | `400` |
| Wrong `Content-Type` | `text/plain` body | `400` or `415` |
| Invalid id in path | `/api/notes/abc` | `400` (not a UUID) |
| Unknown id | a valid UUID that does not exist | `404` |

Invalid ids deserve their own test: `abc`, `123`, a UUID with one character missing, and `00000000-0000-0000-0000-000000000000`. The QA Learning Lab API answers `400` for anything that is not a UUID and `404` for a valid UUID it does not know.

## Boundary tests

Every limit has two sides. For `title` 1–100 characters, test **0, 1, 100 and 101**; for `priority` 1–5, test **0, 1, 5 and 6**, and also `-1`, `2.5` and a very large number. For pagination, `pageSize` accepts only 20, 50 and 100, so `19`, `21` and `0` must fail.

Watch text boundaries closely:

* Count with non-ASCII text: 100 characters of `ế` or emoji are still 100 characters, but more bytes.
* Leading and trailing spaces: does the API trim them before counting?
* Very long input (10 000 characters, a 2 MB body): the API should answer `400` or `413`, not time out.

## After the request: did anything change?

A `400` is only half the check. Read the data back: after a rejected `POST`, no note exists (`GET` the list, compare `total`); after a rejected `PATCH`, the resource is exactly as before. "Returns an error **and** saves part of the data" is a real and nasty bug.

## Error messages

Check that messages help the client but do not help an attacker. `"title must be at most 100 characters"` is good. `"duplicate key value violates unique constraint notes_slug_key"` or a Java stack trace is a bug: it leaks the database and the code. Login errors must not reveal whether an email exists.

## Try it yourself

On the QA Learning Lab API, call `GET /api/v1/courses?pageSize=21`, then `?page=0`, then `?page=abc`. Each must be `400` with the error shape above. Then call `GET /api/v1/lessons/abc` and `GET /api/v1/lessons/00000000-0000-0000-0000-000000000000`, and compare `400` with `404`.

> Key idea: for every field, try missing, wrong type, empty, too small, too big and unknown. Expect a `4xx` with a clear error, and check that nothing was saved.
