An API (Application Programming Interface) is how one program asks another for data or actions. Most web APIs speak **HTTP**: the client sends a **request**, the server sends back a **response**. Testing an API means sending requests on purpose, good ones and bad ones, and checking every part of the response. You do not need a UI for that, which is why API tests are fast and find bugs early.

## Anatomy of a request

Every HTTP request has the same parts:

| Part | Example | What it says |
|---|---|---|
| Method | `GET` | What you want to do |
| URL | `https://api.example.com/api/v1/courses?page=2` | Which resource (path) and options (query string) |
| Headers | `Authorization: Bearer eyJ...`, `Accept: application/json` | Metadata: who you are, which format you want |
| Body | `{"title": "API testing"}` | The data you send (usually for `POST`, `PUT`, `PATCH`) |

The response has a **status code** (`200`, `404`…), headers and, often, a body. The next lessons look at each of them.

## The main methods

| Method | Purpose | Typical success |
|---|---|---|
| `GET` | Read a resource or a list | `200 OK` |
| `POST` | Create a resource or trigger an action | `201 Created` (or `200`) |
| `PUT` | Replace a resource completely | `200 OK` |
| `PATCH` | Change some fields of a resource | `200 OK` |
| `DELETE` | Remove a resource | `204 No Content` (or `200`) |

`PUT` and `PATCH` are often confused. `PUT /notes/7` with `{"title": "New"}` means "note 7 is now exactly this": fields you leave out may be cleared. `PATCH /notes/7` with the same body means "change only the title". When you test a `PUT`, check what happens to the fields you did not send.

## Safe and idempotent

Two properties tell you what a method is allowed to do. They are worth testing, because clients and proxies rely on them (a browser or a mobile app may **retry** a request after a timeout).

* **Safe**: the request does not change anything on the server. `GET` and `HEAD` are safe. A `GET` that deletes or updates data is a bug.
* **Idempotent**: sending the same request once or ten times leaves the server in the same state. `GET`, `HEAD`, `PUT` and `DELETE` are idempotent. Deleting note 7 twice still leaves note 7 deleted (the second call may answer `404`, but the state is the same).
* **Neither**: `POST` is not idempotent: two identical `POST /orders` calls create two orders. `PATCH` is not guaranteed to be idempotent (`{"stock": "+1"}` style changes add up).

| Method | Safe | Idempotent |
|---|---|---|
| `GET`, `HEAD` | Yes | Yes |
| `PUT`, `DELETE` | No | Yes |
| `POST`, `PATCH` | No | Not guaranteed |

A classic API bug: a user double-clicks **Pay**, the app sends `POST /payments` twice, and the customer is charged twice. Testers send the same request twice on purpose to find it.

## A request with curl

`curl` is a command-line tool that sends HTTP requests. Tools like Postman, Insomnia or Swagger UI do the same with a form.

```bash
curl -i -X GET "http://localhost:3000/api/v1/health" -H "Accept: application/json"
```

`-i` prints the status line and the headers, not only the body. A `POST` adds a body and its format:

```bash
curl -i -X POST "https://api.example.com/api/notes" -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"title": "Buy milk"}'
```

## Try it yourself

The QA Learning Lab backend is a real API you can test. Its base path is `/api/v1`, and **Swagger UI** at `/api/docs` lists every endpoint with its methods, parameters and responses. `GET /api/v1/health` needs no login: call it with curl and read the status code and headers. Then open Swagger, find `GET /api/v1/courses` and note which method each course-related endpoint uses.

## Sources

* [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) (IETF, June 2022), section 9 "Methods" (9.2.1 safe methods, 9.2.2 idempotent methods). The explanations and examples are the QALAB team's own.

> Key idea: a request is method + URL + headers + body. Know what each method promises (safe, idempotent) and test that the API keeps the promise.
