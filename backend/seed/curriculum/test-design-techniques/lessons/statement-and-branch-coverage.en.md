The techniques so far design tests from the requirement. **White-box techniques** design them from the code itself, and measure how much of that code the tests actually run. As a QA engineer you will rarely write these tests, but you will read coverage reports and discuss them with developers, so you need to know what the numbers mean, and what they do not mean.

## The example code

A shop charges 5 USD shipping. Members ship free, and so do orders of 50 USD or more.

```ts
function shippingCost(total: number, isMember: boolean): number {
  let cost = 5;
  if (isMember) {
    cost = 0;
  }
  if (total >= 50) {
    cost = 0;
  }
  return cost;
}
```

The function has six executable statements (`let cost = 5`, the two `if`s, the two `cost = 0`, and `return cost`, counting each `if` as one statement here) and two decisions, each with a **true** and a **false** outcome.

## Statement testing

In **statement testing** the coverage items are the executable statements:

> Statement coverage = statements executed by the tests ÷ all executable statements

One test is enough for 100 % here: `shippingCost(60, true)` enters both `if` blocks and runs every line.

100 % statement coverage means every line ran at least once, so a defect sitting on any line had a chance to cause a failure. It does **not** mean every decision was tested: the test above never took the path where an `if` is **false**. It also misses data-dependent defects, such as a division that only fails when the divisor is 0.

## Branch testing

A **branch** is a transfer of control from one point of the code to another: unconditional (straight-line code) or conditional (the true or false outcome of an `if`, a `case` of a `switch`, staying in or leaving a loop). In **branch testing** the coverage items are the branches:

> Branch coverage = branches exercised by the tests ÷ all branches

With `shippingCost(60, true)` alone, both decisions only went the **true** way. Adding `shippingCost(20, false)` makes both go **false**:

| Test | `isMember` decision | `total >= 50` decision | Result |
|---|---|---|---|
| `(60, true)` | true | true | 0 |
| `(20, false)` | false | false | 5 |

Two tests now cover every outcome of every decision: 100 % branch coverage.

**Branch coverage subsumes statement coverage**: 100 % branch coverage always gives 100 % statement coverage, but not the other way round, as the first test showed.

## What coverage cannot tell you

Suppose the developer had written `total > 50`. Both tests above still pass and branch coverage is still 100 %, yet a 50.00 USD order is charged shipping. Only a **boundary value** test (50.00) finds it. And if the requirement also said "students ship free" and nobody implemented it, no coverage figure can reveal the missing code: white-box testing does not find **defects of omission**.

So coverage is a tool for finding **untested code**, not a proof of quality. "80 % branch coverage" tells you 20 % of the branches were never run; it says nothing about whether the other 80 % were checked against the right expected results.

## The value of white-box testing

* It considers the **whole implementation**, so it finds defects even when the specification is vague, outdated or incomplete.
* It gives an **objective measure** of what the tests executed. Black-box testing alone cannot measure code coverage.
* It shows where to **add tests**: the coverage report highlights lines and branches never run.
* It works in **static testing** too: walking through code or pseudocode by hand ("dry run") before it can execute.

In practice, unit test tools produce the report (for example `vitest --coverage`, Jest, JaCoCo, coverage.py). A useful question from a tester in code review: "Which branches of this change are not covered, and are any of them risky?"

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 4.3.1 "Statement testing and statement coverage", 4.3.2 "Branch testing and branch coverage" and 4.3.3 "The value of white-box testing". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: statement coverage counts the lines the tests ran, branch coverage counts the decision outcomes, and 100 % branch coverage includes 100 % statement coverage. Coverage shows untested code; it cannot find wrong boundaries or missing requirements, so combine it with black-box techniques.
