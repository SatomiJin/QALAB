Two questions come up in every planning meeting: *how long will testing take?* and *what do we run first?* This lesson covers how a tester takes part in release and iteration planning, four ways to estimate test effort, and three ways to put test cases in order.

## The tester in release and iteration planning

In iterative development there are two kinds of planning:

| | Release planning | Iteration planning |
|---|---|---|
| Looks ahead to | The release of the product | The end of one iteration (sprint) |
| Works on | The product backlog: splitting big stories into smaller ones | The iteration backlog |
| The tester | Helps write testable stories and acceptance criteria, takes part in risk analysis, estimates test effort per story, decides the test approach and plans testing for the release | Takes part in detailed risk analysis of the stories, checks their testability, breaks stories into tasks (especially testing tasks), estimates them, and refines functional and non-functional aspects |

## Estimating test effort

An estimate is a prediction, built on **assumptions**, and always has an error margin: say so when you give it. Small tasks are estimated more accurately than big ones, so **break a big task down** and estimate the parts.

| Technique | Based on | How it works |
|---|---|---|
| **Ratios** | Metrics from the organisation's past projects | Use a historical ratio, such as development effort to test effort |
| **Extrapolation** | Metrics from the current project | Measure early, then project forward, for example the average of the last iterations |
| **Wideband Delphi** | Experts | Each expert estimates alone; estimates far apart are discussed; repeat until they agree. **Planning Poker** is its Agile variant, with numbered cards |
| **Three-point estimation** | Experts | Estimate an optimistic (a), most likely (m) and pessimistic (b) value; E = (a + 4m + b) ÷ 6, with a standard deviation SD = (b − a) ÷ 6 |

Examples:

* **Ratios**: in the last three releases, testing took about half of the development effort. Development estimates 40 person-days, so testing is about 20 person-days.
* **Extrapolation**: testing took 6, 8 and 7 days in the last three sprints, so plan about 7 days for the next one.
* **Three-point**: testing the new checkout is estimated at a = 4, m = 7, b = 16 person-days. E = (4 + 28 + 16) ÷ 6 = 8 and SD = (16 − 4) ÷ 6 = 2, so the estimate is **8 ± 2 person-days** (6 to 10).

The organisation's own history is usually the best source for ratios: figures from other companies rarely fit.

## Prioritising test cases

Once test cases are grouped into suites, a **test execution schedule** puts them in order. Three common strategies:

| Strategy | Run first | Example |
|---|---|---|
| **Risk-based** | Tests covering the highest risks (from risk analysis) | Payment and discount tests before the footer links |
| **Coverage-based** | Tests that reach the most coverage, such as statement coverage; in the *additional coverage* variant, each next test is the one adding the most new coverage | The end-to-end checkout test first, then the tests that cover what it missed |
| **Requirements-based** | Tests for the requirements with the highest priority, as set by stakeholders | The product owner ranks "pay by card" above "save for later" |

Two practical limits:

* **Dependencies**: if a high-priority test needs a lower-priority one to run first (you cannot test "cancel order" before "place order" works), the lower one goes first.
* **Resources**: a test that needs the payment sandbox, a special device or a specific person must run when they are available.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 5.1.2 "Tester's contribution to iteration and release planning", 5.1.4 "Estimation techniques" and 5.1.5 "Test case prioritization". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it; the numbers in the examples are the team's own.

> Key idea: testers help plan releases and iterations. Estimate with ratios, extrapolation, Wideband Delphi or three-point estimation, and state the assumptions; order the tests by risk, coverage or requirement priority, while respecting dependencies and resources.
