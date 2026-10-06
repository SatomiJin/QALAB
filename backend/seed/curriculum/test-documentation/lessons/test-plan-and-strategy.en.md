Before anyone writes a test case, the team needs to agree on what will be tested, how, by whom and when, and on what "done" means. That agreement is written down in two documents: the **test strategy** and the **test plan**. A good plan fits on one page and saves days of arguments later.

## Test strategy vs test plan

| | Test strategy | Test plan |
|---|---|---|
| Question | How do we test, in general? | How do we test *this* release or feature? |
| Lifetime | Long-lived, changes rarely | One per release, project or big feature |
| Owner | QA lead, for a product or a company | Test lead or the tester of the feature |
| Example content | "Regression is automated at API level; every release gets a smoke test" | "Discount codes for release 2.4 are tested 3–14 March by Anna and Ben" |

The strategy sets the rules; the plan applies them to a concrete piece of work. In a small team the strategy may be a short section at the top of the plan.

## What a test plan contains

| Section | What it answers | Example |
|---|---|---|
| Scope | What will be tested | Applying discount codes at web checkout |
| Out of scope | What will deliberately *not* be tested, and why | Mobile app (released next quarter) |
| Approach | Test levels, types and techniques | Functional tests with boundary values, API tests for the rules, exploratory session on the UI |
| Entry criteria | What must be true to start | Build on staging, smoke test passes, rules approved |
| Exit criteria | What must be true to finish | All high-priority cases run, no open critical or major bugs |
| Risks | What could go wrong, and the plan B | Payment sandbox unavailable → mock the provider |
| Resources | People, environments, tools, test data | 2 testers, staging, 20 test accounts |
| Schedule | When each activity happens | Design 3–5 March, execution 6–12 March |
| Deliverables | What QA hands over | Test cases, bug reports, test summary report |

The ISTQB syllabus lists a few more parts that bigger plans include: the **context** (test objectives, test basis), **assumptions and constraints**, the **stakeholders** and their roles, how the team will **communicate** (reports, frequency, templates), the **budget**, and any deviation from the organisation's test policy and strategy. A plan also serves as communication: writing it forces the team to think through risks, people, tools and effort before the work starts.

## Scope and out of scope

Writing **out of scope** explicitly is as important as writing scope. "We will not test the mobile app" protects the team: if a mobile bug appears, everyone agreed in advance that it was not covered. Always give the reason (another team owns it, not released yet, accepted risk), so the decision can be challenged.

## Entry and exit criteria you can check

Criteria are useful only if anyone can say yes or no to them.

| Vague | Checkable |
|---|---|
| The build is stable | Smoke test suite passes on staging |
| Testing is complete | 100 % of high-priority cases executed |
| Quality is good enough | No open critical or major defects, pass rate ≥ 95 % |

Exit criteria are not a promise of zero bugs (exhaustive testing is impossible). They are the agreed point at which the team has enough information to decide.

Running out of time or budget can also be a valid reason to stop, **if the stakeholders have reviewed and accepted the risk** of releasing without further testing. In Agile teams the exit criteria are usually called the **Definition of Done**, and the entry criteria a user story must meet before work starts are the **Definition of Ready**.

## Risks drive the approach

List the risks, rate each by **likelihood** and **impact**, and spend most effort where both are high. A discount code that gives the wrong total costs money on every order, so it gets boundary value tests and API tests. A typo in a tooltip gets a quick look. Each risk also has a **mitigation**: what the team does to reduce it or to cope if it happens.

## A one-page plan example

| Section | Release 2.4: discount codes |
|---|---|
| Scope | Apply, remove and combine codes at web checkout; total and tax calculation |
| Out of scope | Mobile app (next quarter); payment provider performance (provider's SLA) |
| Approach | Equivalence partitioning and boundary values on code rules; API tests for totals; one exploratory session |
| Entry | Build 2.4.0 on staging, smoke suite passes, rules signed off by the product owner |
| Exit | All high-priority cases run; no open critical or major defects; summary report sent |
| Risks | Sandbox downtime → mock; only one tester knows checkout → pair testing |
| Resources | Anna, Ben; staging; 20 accounts; codes SAVE10, SAVE15, EXPIRED01 |
| Schedule | Design 3–5 March; execution 6–12 March; report 13 March |

A plan is a living document: when the scope or the dates change, update it and tell the team.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 5.1.1 "Purpose and content of a test plan" and 5.1.3 "Entry criteria and exit criteria". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: the test strategy is the general way a team tests; the test plan applies it to one release, with a clear scope and out of scope, checkable entry and exit criteria, and risks that decide where the effort goes.
