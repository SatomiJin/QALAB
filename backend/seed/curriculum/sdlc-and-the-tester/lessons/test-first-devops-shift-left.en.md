Modern teams do not wait for a finished build to start testing. Tests are written before the code, run automatically on every change, and the process itself is tested in regular retrospectives. This lesson covers the **test-first** approaches (TDD, ATDD, BDD), what **DevOps** changes for testers, how to **shift left**, and how **retrospectives** improve the way a team tests.

## Test-first: tests that drive development

In three related approaches, tests are defined *before* the code and guide what gets built. All three apply early testing and suit iterative development, and the tests usually stay as automated regression tests afterwards.

| Approach | Who writes the tests | From what | Example |
|---|---|---|---|
| **TDD** (test-driven development) | Developers | The design of a small piece of code | Write a failing unit test for `applyDiscount()`, write the code until it passes, then refactor |
| **ATDD** (acceptance test-driven development) | The team with the business | Acceptance criteria of a story | Agree the acceptance tests for "free shipping from $50" before the story is built |
| **BDD** (behaviour-driven development) | The team with the business | Desired behaviour, in plain language | A Given / When / Then scenario that is later automated |

A BDD scenario reads like this, and tools such as Cucumber can run it as a test:

```gherkin
Scenario: Free shipping at the threshold
  Given my basket total is $50.00
  When I go to checkout
  Then the shipping cost is $0.00
```

TDD follows a short cycle: **red** (a failing test), **green** (just enough code to pass), **refactor** (clean up with the test as a safety net).

## DevOps and testing

**DevOps** brings development (testing included) and operations together around shared goals. It relies on team autonomy, fast feedback, an integrated toolchain and **continuous integration and continuous delivery (CI/CD)**: every change is built, tested and made ready to release through an automated **delivery pipeline**.

```text
commit → build → static analysis → unit tests → API tests → deploy to staging → UI and regression tests → release
```

| Benefits for testing | Risks and costs |
|---|---|
| Fast feedback on every change | The pipeline must be designed and maintained |
| CI pushes developers to submit code with component tests and static analysis | CI/CD tools must be introduced and kept running |
| Automated, stable test environments | Test automation needs people and time, and is hard to maintain |
| Better visibility of performance and reliability | |
| Less repetitive manual testing, lower regression risk | |

Even with heavy automation, **manual testing from the user's point of view is still needed**: exploratory testing, usability, things nobody thought to automate.

## Shift left

**Shift left** is the principle of early testing applied to the whole life cycle: test earlier, without neglecting later testing. Ways to do it:

* Review specifications and stories from a tester's point of view (ambiguities, gaps, contradictions).
* Write test cases before the code, and run the code in a test harness while it is written (TDD, ATDD).
* Use CI, better CD, so component tests run with every commit.
* Run static analysis on the code before dynamic testing, or inside the pipeline.
* Start non-functional testing (for example performance) at component level instead of waiting for the full system.

Shift left costs effort and training early but saves more later, and it only works if the stakeholders agree to invest in it.

## Retrospectives: improving how we test

A **retrospective** is held at the end of an iteration, a release or a project, or when needed. Everyone involved (developers, testers, Product Owner, analysts) discusses:

1. What went well and should be kept?
2. What did not go well and could be improved?
3. How do we put the improvements in place and keep the successes?

Results are recorded (often in the test completion report) and, above all, **followed up**: an improvement nobody acts on is just a complaint. For testing, retrospectives typically bring more effective tests, better testware, better requirements, better cooperation between developers and testers, and a team that learns together.

Example: "Three bugs this sprint came from unclear date rules" → action: "every story with dates includes examples at month end", owner: the Product Owner, check at the next retrospective.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 2.1.3 "Testing as a driver for software development", 2.1.4 "DevOps and testing", 2.1.5 "Shift left" and 2.1.6 "Retrospectives and process improvement". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: in TDD, ATDD and BDD tests come before the code and drive it; DevOps runs those tests automatically in a pipeline for fast feedback; shift left moves every kind of testing as early as possible; and retrospectives, followed up, keep improving how the team tests.
