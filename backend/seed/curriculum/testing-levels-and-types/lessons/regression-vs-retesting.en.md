Every change to the code is a new risk. A fix can be incomplete, and it can break something that worked yesterday. Two kinds of testing answer these two risks, and they are often confused.

## Retesting (confirmation testing)

**Retesting**, also called **confirmation testing**, checks that **a specific defect has really been fixed**. You run again the exact test that failed, with the same steps and data, on the new build.

* **When:** after a developer marks a bug as fixed.
* **Scope:** narrow, the failed test cases of that bug (plus small variations around it).
* **Result:** the bug is **closed** if the test now passes, or **reopened** if it still fails.

Example: bug BUG-214 says "A 50.00 USD order is charged shipping". After the fix you place a 50.00 USD order again and check that shipping is free. You also try 49.99 and 50.01, because a fix at a boundary often moves the problem by one.

## Regression testing

**Regression testing** checks that **a change did not break what already worked**. A *regression* is a feature that used to work and no longer does.

* **When:** after any change: a bug fix, a new feature, a library upgrade, a configuration change, a new environment.
* **Scope:** wide, the areas that could be affected by the change, even though nobody touched them on purpose.
* **Result:** you look for **new** failures, not for the old bug.

Example: the shipping fix changed the function that computes totals. Regression tests check the rest: discount codes, taxes, the invoice PDF, the order history, the mobile checkout.

## Side by side

| | Retesting | Regression testing |
|---|---|---|
| Goal | Is this bug fixed? | Did the change break anything else? |
| Tests run | The tests that failed | Tests that passed before |
| Scope | Narrow, known | Wide, chosen by risk |
| Planned in advance | No, depends on which bugs are fixed | Yes, a maintained regression suite |
| Good for automation | Rarely | Very often |

Retesting usually comes first: there is no point in a full regression run on a build that does not even fix the bug it was made for.

## Choosing the regression tests

Running every test after every change is rarely possible. Testers select the regression tests with **impact analysis**: working out which parts of the system a change can affect.

Questions for impact analysis:

* Which code, screens and APIs were changed?
* What **uses** that code? A shared function (price calculation, date formatting, login) affects every feature that calls it.
* Which data or database tables were changed?
* What broke in this area before? Defects cluster.
* Which flows matter most to the business if they break (payment, sign-up, login)?

A common way to organise the suite:

* **Core regression set:** the critical flows, run on every release (often automated).
* **Targeted set:** tests for the areas the impact analysis points to.
* **Full regression:** everything, for big releases or major upgrades.

The regression suite needs maintenance: add a test for every important bug fixed (so it cannot come back unnoticed), remove obsolete tests, and update tests when features change.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 2.2.3 "Confirmation testing and regression testing" (and principle 4, defects cluster together, in 1.3). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: retesting proves *the bug is gone*; regression testing proves *nothing else broke*. Choose regression tests by impact and risk, not by habit.
