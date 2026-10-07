Once you know *what* to automate, the next question is *where*: the same rule can often be checked through the UI, through the API, or directly in the code. The **automation pyramid** (also called the test pyramid) is a simple model for spreading tests across those levels so the suite stays fast, cheap and trustworthy.

## The three levels

```text
        /\
       /UI\         few: whole user journeys through the browser
      /----\
     / API  \       more: services and endpoints, no browser
    /--------\
   /   Unit   \     most: functions and classes in isolation
  /------------\
```

| Level | What it checks | Speed | Cost to write and maintain | When it fails, you know… |
| --- | --- | --- | --- | --- |
| **Unit** | One function or class, with its dependencies replaced | Milliseconds | Low | Exactly which function is wrong |
| **API / service** | An endpoint or service with its real logic and database | Tens to hundreds of milliseconds | Medium | Which endpoint and which rule |
| **UI / end-to-end** | A user journey through the real interface | Seconds per test | High | Something in the journey is broken, somewhere |

The higher you go, the more of the real system a test covers, so it gives more **confidence** that the pieces work together. But it is also slower, more fragile (more parts that can break or be slow) and harder to debug.

## Why the shape matters

The pyramid says: **many** small fast tests at the bottom, **fewer** at each level up.

Take a discount rule: "orders from 50 USD get free shipping".

* **Unit**: test the `shippingCost(total)` function with 49.99, 50.00 and 50.01. Hundreds of such checks run in a second.
* **API**: one or two calls to `POST /orders` to prove the endpoint uses that function and stores the right amount.
* **UI**: one checkout journey that shows "Free shipping" on the page, to prove the screen displays what the API returns.

Testing all boundary values through the UI would work, but it would take minutes instead of milliseconds and break every time a button moved.

A good rule of thumb: **check each rule at the lowest level that can catch the bug**, and use higher levels for what only they can see (integration between parts, what the user actually sees).

## The ice-cream cone anti-pattern

Many teams end up with the pyramid upside down:

```text
  \--------------/
   \  manual    /    lots of manual regression
    \----------/
     \  UI    /      most automated tests are UI tests
      \------/
       \API /        few API tests
        \--/
         \/          almost no unit tests
```

This is the **ice-cream cone**. It usually happens when QA automates by recording what a manual tester does in the browser, and developers do not write unit tests. The symptoms:

* The suite takes an hour, so it runs nightly instead of on every pull request.
* Tests fail because of timing or a changed label, not because of bugs, so people stop trusting red builds.
* A failure says "checkout test failed" and someone spends an hour finding out why.

Moving checks down the pyramid (a UI test becomes an API test plus a unit test) is often the biggest improvement you can make to a suite.

## Who writes what

The pyramid is a team effort. Developers usually write the unit tests; QA engineers often own API and UI automation and review whether the levels are balanced. A QA engineer who can read unit tests and say "this rule is already covered below, we do not need a UI test for every case" saves the team a lot of time.

## The testing quadrants

The pyramid is about **how many** tests of each size. The **testing quadrants** (Brian Marick, popularised for Agile teams) are about **which kinds** of tests a team needs. Tests are either **business facing** or **technology facing**, and they either **support the team** (guide development) or **critique the product** (measure it against expectations):

| Facing | Support the team | Critique the product |
|---|---|---|
| **Business facing** | **Q2**: functional tests, examples, user story tests, UX prototypes, API tests, simulations; manual or automated | **Q3**: exploratory testing, usability testing, user acceptance testing; user-oriented, often manual |
| **Technology facing** | **Q1**: component and component integration tests; automated, in CI | **Q4**: smoke tests and non-functional tests (except usability); often automated |

A team that only fills Q1 and Q2 has a well-built product nobody has tried as a user; a team that only does Q3 finds problems late and slowly. Use the quadrants to check that every kind of testing has a place in the plan.

## It is a model, not a law

The exact proportions depend on the product. An app that is mostly a thin screen over a third-party API may have few unit tests and more API tests (sometimes drawn as a "trophy" with a wide middle). The principle stays the same: prefer the fastest, most precise test that can catch the bug, and keep slow, broad tests for the journeys that matter most.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 5.1.6 "Test pyramid" and 5.1.7 "Testing quadrants". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: many fast unit tests, fewer API tests, a small set of UI journeys; avoid the ice-cream cone, where slow UI and manual tests carry everything.
