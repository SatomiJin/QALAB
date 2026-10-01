A bug report competes for attention with dozens of others. The ones that get fixed quickly have something in common: a developer can read them in a minute, reproduce the problem on the first try and trust what they say. This lesson collects the habits that make that happen.

## One bug per report

Each report describes **one** problem. "Checkout: the total is wrong, the Pay button is misaligned and the confirmation email never arrives" is three bugs. Together they cannot be assigned to three people, fixed in different releases or closed one at a time. If you are not sure whether two symptoms share a cause, write two reports and link them.

## Facts, not opinions

Developers act on facts. Opinions, guesses and emotions make a report longer and less trustworthy.

| Opinion or guess | Fact |
|---|---|
| The search is really slow | Search for "shoes" takes 8–9 s; the requirement is under 2 s |
| The backend is probably caching wrong | After changing the price to 25.00, the product page still shows 20.00 for 10 minutes |
| This is a terrible bug, users will hate it | All 3 test accounts saw the error; it blocks the checkout |
| It does not work | `POST /api/orders` returns `500` with `{"error":"Internal Server Error"}` |

If you have a hypothesis about the cause, you may add it in a separate **Notes** line, clearly marked as a guess.

## Reproduction rate

Not every bug happens every time. Say how often it happens, and under which conditions you tried:

* **Always (10/10)**: the normal case; the steps are enough.
* **Intermittent (3/10)**: give the rate, the time of the attempts and anything that differs between failing and passing runs (network, data, account).
* **Once**: report it anyway if the impact is serious, say that you could not reproduce it, and attach every piece of evidence you have.

An intermittent bug without a rate looks like a bug that cannot be reproduced, and it will be closed as such.

## Logs and screenshots

Evidence turns "I saw it" into "here it is":

* **Screenshots** for anything visual, with the problem circled or highlighted.
* **Screen recordings** when the order of actions or the timing matters.
* **Browser console and network tab** for web bugs: copy the error and the failing request.
* **API request and response**: method, URL, headers (without the token), body, status code. A `curl` command lets the developer replay it.
* **Server or device logs** with the timestamp, so the developer can find the matching lines.

```text
POST /api/v1/orders  ->  500 Internal Server Error
time: 2026-03-14 10:42:07 UTC   request-id: 7f3c2a91
```

Remove passwords, tokens and personal data before attaching anything.

## Avoid duplicates

A duplicate costs everyone time: someone has to notice it, link it and close it. Before you report:

1. Search the tracker for the area and the key words of the symptom ("discount", "SAVE15", "checkout total").
2. Check recently closed bugs too: the problem may be fixed in a newer build, or it may be a regression.
3. If the bug already exists, **add your information** to it (new environment, better steps, a log) instead of opening a new report.

## A quick checklist

Before you press *Create*, check that:

* the title says what is wrong, where and when;
* the steps start from a clear state and contain only what is needed;
* actual and expected results are concrete;
* severity and priority are rated separately;
* environment, reproduction rate and evidence are there;
* it is one bug, and not already reported.

> Key idea: a report gets fixed when it is easy to trust and easy to reproduce: one bug, facts only, a reproduction rate, evidence attached, and no duplicate.
