Test documentation comes in different levels of detail. A **test scenario** says *what* to check, a **test case** says exactly *how* to check it, and a **test suite** groups test cases that are run together. Choosing the right level for the job is a skill: too little detail and nobody can repeat your test, too much and you spend the sprint writing instead of testing.

## Three levels of detail

| | Test scenario | Test case | Test suite |
|---|---|---|---|
| What it is | One situation to check, in one line | Exact preconditions, data, steps and expected result | A named group of test cases |
| Answers | What could happen? | How do I check it, and what must I see? | Which cases do we run together? |
| Example | Check login with a locked account | TC-LOGIN-005: locked user anna@example.com enters the right password → message "Account locked, try again in 15 minutes" | Smoke suite, login regression suite |
| Effort to write | Minutes | Longer, one per check | Grouping only |

## Test scenarios

A scenario is a one-line idea of something a user can do or something that can go wrong. Scenarios come straight from requirements and user stories, and they are the fastest way to see the **breadth** of testing: list them first, review them with the developer and the product owner, and you find the forgotten cases before writing any detail.

For a login feature:

* Log in with a valid email and password
* Log in with a wrong password
* Log in with an unverified account
* Log in with a locked account
* Log in when the email has upper-case letters or spaces around it

## Test cases

Each scenario becomes one or more test cases. "Log in with a wrong password" may need two cases: one for a wrong password on an existing account, and one for an unknown email (both must show the same generic message). A test case is detailed enough that another tester, or an automation engineer, gets the same verdict as you. The next module covers its fields one by one.

## Test suites

A suite groups cases for a purpose, and one case can belong to several suites:

| Suite | Contains | Run when |
|---|---|---|
| Smoke | 10–20 cases on the most important flows | Every new build, before anything else |
| Feature (login) | Every login case | When login changes |
| Regression | Cases for everything already released | Before every release |

Test management tools (TestRail, Zephyr, Xray, a spreadsheet) let you build suites as lists or tags, and run a suite as one **test run** with its own verdicts.

## Example: checkout with a discount code

| Level | Example |
|---|---|
| Scenario | Apply a valid discount code at checkout |
| Test case | TC-CHK-010: logged-in user, basket with one item at 50.00 USD; enter `SAVE10` and press **Apply** → discount line −5.00 USD, total 45.00 USD |
| Suite | Checkout regression (with TC-CHK-001 … TC-CHK-030) |

## When to use each

| Situation | Usually enough |
|---|---|
| Early exploration of a new feature by experienced testers | Scenarios as a checklist |
| Regression that anyone in the team must run the same way | Detailed test cases |
| Audit or contract that requires evidence per requirement | Detailed test cases with recorded results |
| Cases that will be automated | Detailed test cases (the script needs exact data and checks) |
| Planning what to run tonight | Suites |

Many teams combine them: scenarios for new work, detailed test cases for the flows that matter most and for anything that must be repeated or automated.

> Key idea: scenarios give the breadth (what to check), test cases give the precision (how, with which data, and what must happen), and suites decide what is run together. Pick the level that lets the next person get the same result.
