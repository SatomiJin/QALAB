The **status code** is the first thing to check in any API response. It is a three-digit number that tells the client what happened, before anyone reads the body. A wrong status code is a real bug even when the body looks right: the frontend, mobile apps and monitoring all make decisions based on it.

## The five families

| Range | Meaning | Whose problem |
|---|---|---|
| `1xx` | Informational (rare in tests) | – |
| `2xx` | Success | – |
| `3xx` | Redirection: look somewhere else | – |
| `4xx` | Client error: the request is wrong | The caller must change the request |
| `5xx` | Server error: the server failed | The server team must fix something |

The most important rule for a tester: **a request the client can get wrong must never produce a `5xx`**. Invalid JSON, a missing field or a text where a number is expected are client mistakes, so the answer is a `4xx` with a clear message. A `500` there means the server did not validate its input.

## The codes you will meet most

| Code | Name | Typical case |
|---|---|---|
| `200` | OK | A `GET` or `PATCH` worked; the body has the result |
| `201` | Created | A `POST` created a resource; often with a `Location` header |
| `204` | No Content | Success with no body, e.g. `DELETE` or logout |
| `301` / `304` | Moved Permanently / Not Modified | Redirect; cached copy still valid |
| `400` | Bad Request | Invalid input: wrong type, missing field, unknown field |
| `401` | Unauthorized | No token, or the token is invalid or expired: "who are you?" |
| `403` | Forbidden | Valid token, but this user may not do this: "I know you, and no" |
| `404` | Not Found | The resource does not exist (or you may not know it exists) |
| `409` | Conflict | Clashes with the current state: duplicate email or slug |
| `422` | Unprocessable Content | Well-formed but semantically invalid (some APIs use it instead of `400`) |
| `429` | Too Many Requests | Rate limit reached; often with `Retry-After` |
| `500` | Internal Server Error | An unexpected failure on the server |

`400` vs `422`: both mean "your data is wrong". An API should pick one convention and use it everywhere; mixing them is worth a bug report. The QA Learning Lab API uses `400` for all validation errors.

## Headers that matter in tests

Headers are `Name: value` lines on the request and the response.

| Header | Direction | What to check |
|---|---|---|
| `Content-Type` | Both | The format of the body. A JSON response must say `application/json`; a JSON request must send it too, or the server may not parse the body |
| `Accept` | Request | The format the client wants back |
| `Authorization` | Request | Credentials, usually `Bearer <token>` |
| `Cache-Control`, `ETag` | Response | Whether the response may be cached. Private data (a profile, a dashboard) must not be cached by shared caches |
| `Location` | Response | Where a newly created resource lives (with `201`) |
| `Retry-After` | Response | How long to wait after a `429` |

A typical response, printed with `curl -i`:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"statusCode": 404, "error": "Not Found", "message": "Course not found"}
```

## How to assert on a response

1. **Status code** first: exactly the expected one, not "any 2xx".
2. **Headers**: `Content-Type`, and the special ones for the case (`Location`, `Retry-After`, caching).
3. **Body**: the data (next lesson) or, for errors, the error shape and a useful message.

An error body that says `200` in the status line and `{"error": "Not found"}` in the body is a bug: clients that check only the status will think it worked.

## Try it yourself

Call `GET /api/v1/courses` on the QA Learning Lab API without an `Authorization` header and note the status code (every endpoint except `GET /api/v1/health` and the public `/auth/*` ones needs a Bearer token). Then call it with a token from Swagger UI (`/api/docs`, button **Authorize**). Compare the status codes and the `Content-Type` of both responses.

## Sources

* [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) (IETF, June 2022), section 15 "Status codes" (15.1 overview, 15.2–15.6 the five classes) and the header fields it defines. The explanations and examples are the QALAB team's own.

> Key idea: check the status code exactly, then the headers, then the body. Client mistakes are `4xx`; a `5xx` for bad input is a bug.
