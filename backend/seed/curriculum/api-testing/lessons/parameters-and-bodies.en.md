A request can carry data in four places: the path, the query string, the headers and the body. Each place has its own rules, and each one is a place where an API can go wrong. Knowing where a value belongs helps you design tests and read API documentation.

## Path parameters

A **path parameter** identifies one resource. It is part of the URL path:

```http
GET /api/v1/lessons/3f2b8c1e-5a7d-4e2b-9c1a-0d6e8f4a2b17
```

Here the lesson id is a UUID. (Some APIs use a readable **slug** instead, like `/api/v1/courses/api-testing`.) Typical tests: a valid id that exists (`200`), a valid id that does not exist (`404`), and a value that is not a UUID at all, like `abc` or `123` (`400`, not `500`).

## Query parameters

**Query parameters** come after `?` and are joined by `&`. They change *how* a resource is returned: filter, sort, language, page.

```http
GET /api/v1/courses?page=2&pageSize=20&lang=vi
```

Things to test: the default when a parameter is missing, every allowed value, a value that is not allowed (`pageSize=7`), a wrong type (`page=abc`), and a parameter the API does not know (`?colour=red`). Strict APIs, like the QA Learning Lab API, answer `400` for unknown query parameters; lenient ones ignore them. Either is fine if it is documented and consistent.

## Pagination

Lists that can grow are returned **one page at a time**. The QA Learning Lab API uses `page` (starting at 1) and `pageSize` (20, 50 or 100, default 20), and every list response says where you are:

```json
{
  "items": [{ "id": "3f2b8c1e-5a7d-4e2b-9c1a-0d6e8f4a2b17", "title": "API testing" }],
  "total": 45,
  "page": 3,
  "pageSize": 20
}
```

With `total` 45 and `pageSize` 20 there are 3 pages, and page 3 holds 5 items. Pagination tests:

| Test | Expected |
|---|---|
| No parameters | `page` 1, `pageSize` 20 |
| Last page | Only the remaining items (5) |
| Page past the end (`page=99`) | `200`, empty `items`, real `total` |
| `page=0` or `page=-1` | `400` |
| `pageSize=7` or `pageSize=1000` | `400` (only 20, 50, 100 allowed) |
| Items across pages | No item twice, none missing |

## Request body

`POST`, `PUT` and `PATCH` usually send a **JSON body** with `Content-Type: application/json`:

```json
{ "title": "Buy milk", "dueDate": "2026-10-15", "done": false }
```

JSON has types: strings in quotes, numbers, `true`/`false`, `null`, arrays `[]`, objects `{}`. `"15"` (a string) is not `15` (a number), and a good API rejects the wrong one. The next module tests bodies in depth.

## Response body: what to check

Do not stop at "it returned something". For every response, check:

* **Shape**: the documented fields are present, with the right types (`total` is a number, `items` is an array).
* **Values**: the data is correct: the note you created has the title you sent; a filter returns only matching items.
* **Nothing extra**: no secrets (password hashes, answer keys, internal ids of other users), no fields the documentation does not list.
* **Consistency**: dates in one format (ISO 8601: `2026-10-15T08:30:00Z`), naming in one style (the QA Learning Lab API uses camelCase: `pageSize`, `createdAt`).
* **Round trip**: what you write with `POST` is what you read back with `GET`.

JSON key order does not matter: `{"a": 1, "b": 2}` and `{"b": 2, "a": 1}` are the same object, so do not assert on it. Values that change on every run (generated ids, timestamps) are checked by type and format, not by exact value.

## Try it yourself

In Swagger UI (`/api/docs`), call `GET /api/v1/courses` with `pageSize=20`, then with `pageSize=7` and with `page=99`. Compare the status codes and check that `total` stays the same while `items` changes. Then try an unknown parameter such as `?sort=title`.

> Key idea: path = which resource, query = how to return it, body = the data. Test each place with valid, invalid and missing values, and check the whole response, not just that it arrived.
