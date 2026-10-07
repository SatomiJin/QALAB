An API has clients: a web frontend, a mobile app, other services. They are written against an agreement about what requests look like and what responses contain. That agreement is the **contract**. Schema validation checks that one response follows it; contract testing checks that the provider and its consumers still agree. Both catch the bug where "the API works" but the app breaks.

## JSON Schema

A **JSON Schema** describes the shape of a JSON document: which fields exist, their types, which are required, and their limits.

```json
{
  "type": "object",
  "required": ["items", "total", "page", "pageSize"],
  "additionalProperties": false,
  "properties": {
    "items": { "type": "array" },
    "total": { "type": "integer", "minimum": 0 },
    "page": { "type": "integer", "minimum": 1 },
    "pageSize": { "type": "integer", "enum": [20, 50, 100] }
  }
}
```

Validating every response against its schema catches what a quick look misses: `total` sent as the string `"45"`, a field that became `null`, a renamed field, an extra field that leaks data (`additionalProperties: false` flags it). Test tools such as Postman, Playwright, REST Assured or Ajv can validate a schema in one line per test.

## OpenAPI

**OpenAPI** (formerly Swagger) describes a whole API in one file: every endpoint, method, parameter, request body, response and status code, with JSON Schemas for the bodies. It serves as:

* **Documentation**: Swagger UI renders it as an interactive page. The QA Learning Lab API serves it at `/api/docs`.
* **A test oracle**: what the spec says is the expected result. A response that differs from the spec is either a bug in the API or a bug in the spec, and both are worth reporting.
* **A source of tests**: tools can generate requests from the spec, including invalid ones.

When you test an endpoint, compare it with the spec: does `POST` really return `201` as documented? Are all documented error codes (`400`, `401`, `404`, `409`) reachable and shaped as documented? Is a documented field actually returned?

## Contract testing

In a system with many services, end-to-end tests of everything together are slow and fragile. **Contract tests** check each side separately against a shared contract.

**Consumer-driven contracts** (the idea behind tools like Pact):

1. The **consumer** (say, the mobile app) writes down what it uses: "`GET /courses` returns `items[].id` (string) and `items[].title` (string), and `total` (integer)".
2. The **provider** (the API) runs these expectations in its own pipeline.
3. If a change in the API breaks an expectation, the provider's build fails **before** release, and the team knows exactly which consumer would break.

A consumer only lists what it really uses, so the provider stays free to change everything else.

## What breaks a contract

| Change | Breaking? | Why |
|---|---|---|
| Rename a response field (`title` → `name`) | Yes | Clients read `title` and get nothing |
| Remove a response field | Yes | Same |
| Change a type (`total`: number → string) | Yes | Client code that does arithmetic fails |
| Make an optional request field required | Yes | Old clients do not send it and get `400` |
| Change a status code (`201` → `200`) | Yes | Clients that check for `201` fail |
| Add a new optional response field | No | Clients ignore what they do not read |
| Add a new endpoint | No | Nobody uses it yet |
| Add an optional request field | Usually no | Old clients just do not send it |

Careful: adding a field is only safe for clients that ignore unknown fields. And adding a new value to an enum (a new `status`) can break a client that handles only the known values. When a breaking change is needed, APIs add a new version (`/api/v2`) and keep the old one for a while; that is why the QA Learning Lab API lives under `/api/v1`.

## Try it yourself

Open `/api/docs` on the QA Learning Lab API, pick `GET /api/v1/courses` and read the response schema in Swagger UI. Call the endpoint and compare the real response field by field with the schema: names, types, required fields, and anything extra.

## Sources

* [JSON Schema specification](https://json-schema.org/specification), current dialect 2020-12.
* [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) (latest: 3.2.1, September 2026), Apache License 2.0. Contract testing is described as common practice. The explanations and examples are the QALAB team's own.

> Key idea: the contract is what clients rely on. Validate responses against the schema, compare behaviour with the spec, and treat renamed, removed or retyped fields as breaking changes.
