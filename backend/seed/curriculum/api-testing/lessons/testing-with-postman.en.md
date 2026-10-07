curl is perfect for one request. Real API testing means dozens of requests, several environments and checks you can run again tomorrow. **Postman** is the most widely used tool for that: you organise requests into collections, switch environments with variables, write checks in JavaScript, and run everything from the app or from CI.

## Collections, requests and environments

| Concept | What it is | Example |
|---|---|---|
| **Request** | One HTTP call: method, URL, headers, body | `POST {{baseUrl}}/orders` |
| **Collection** | A group of requests, with folders, that you can share and run together | "Shop API" with folders Auth, Orders, Products |
| **Environment** | A set of variables for one target | `local`, `staging` |
| **Variable** | A named value used as `{{name}}` in URLs, headers, bodies and scripts | `{{baseUrl}}`, `{{token}}` |

Variables have **scopes**, from the broadest to the narrowest: **global**, **collection**, **environment**, **data** (from a data file in a run) and **local** (inside one script). When two scopes define the same name, the **narrowest wins**: an environment's `baseUrl` overrides the collection's. That is how one collection tests local and staging without editing a single request.

By default, variable values stay **local** to your Postman and are not synced to the cloud. Keep it that way for tokens and passwords; never put real secrets in shared values.

## Scripts: Pre-request and Post-response

Each request (and each folder or collection) has a **Scripts** tab with two parts:

* **Pre-request**: runs before the request is sent; prepares data, for example a timestamp or a token.
* **Post-response**: runs after the response arrives; this is where the **tests** go.

A test is `pm.test(name, function)`; inside it you assert with `pm.response.to.have…` or `pm.expect(…)` (the Chai assertion library is built in). A post-response script for creating an order:

```js
pm.test('Status is 201 Created', function () {
  pm.response.to.have.status(201);
});

const order = pm.response.json();

pm.test('Order has an id and the right total', function () {
  pm.expect(order.id).to.be.a('string');
  pm.expect(order.total).to.eql(24);
});

pm.test('Responds within 800 ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(800);
});

pm.collectionVariables.set('orderId', order.id);
```

The last line **chains** requests: the next request, `GET {{baseUrl}}/orders/{{orderId}}`, reads the order just created. Use `pm.environment.set` for a value that belongs to one environment, such as a token from the login request.

Write the same checks you learned in this course: the status code, the important headers, the body fields and types, the error format for negative cases. A request without tests is only a manual check.

## Running a whole collection

* **Collection Runner** (in the app): runs every request of a collection or folder in order and shows each test's result. With a **data file** (CSV or JSON) it runs once per row, which turns one request into a data-driven test (valid and invalid inputs, boundary values).
* **Postman CLI** (in CI): runs the collection from the command line and fails the build when a test fails:

```bash
postman collection run ./shop-api.postman_collection.json -e ./staging.postman_environment.json -r cli,junit
```

`-e` picks the environment, `-r` the reporters (cli, json, junit, html); `-d` adds a data file. **Newman** is the older, open-source command-line runner you will still meet in many pipelines.

## Good habits

* One collection per API, folders per resource, requests named after what they check.
* Every request has at least a status test; negative requests are in the collection too.
* Variables for every URL, id and token: no hard-coded environments.
* Order matters in a run: create, then read, then delete; clean up the data you create.
* Test only APIs you are allowed to test: your own, a demo API or a mock, never a production system without permission.

## Try it yourself

The QA Learning Lab API documents itself with OpenAPI at `/api/docs`. Create a collection with a `baseUrl` variable, add `GET {{baseUrl}}/api/v1/health` with a status test and a response time test, then add one negative request (an unknown route) and test that it answers 404.

## Sources

* Postman Learning Center: [Write scripts to test API response data](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/), [Store and reuse values using variables](https://learning.postman.com/docs/sending-requests/variables/variables/), [Reference variables in scripts](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables) and [Run a collection using the Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-run-collection), checked 7 October 2026 (docs v12). © Postman; summarised in our own words. The scripts and the example collection are the QALAB team's own.

> Key idea: a Postman collection groups requests, environments and variables switch the target (the narrowest scope wins), post-response scripts hold the tests (pm.test, pm.expect), and the Collection Runner or the Postman CLI runs everything again, data-driven and in CI.
