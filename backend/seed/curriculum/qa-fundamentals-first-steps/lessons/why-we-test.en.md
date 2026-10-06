Software testing is the work of **finding out how a product actually behaves** and comparing that with how it should behave, so that the team can decide whether it is ready. It is more than running the software: reading requirements, designing tests and reporting results are testing too.

## Testing is about information

A tester does not "make the software good". A tester produces information:

* what works as expected,
* what does not, and how badly,
* what has not been checked yet.

The team (product owner, developers, you) uses that information to decide: ship, fix first, or accept the risk.

## What testing aims at

A test effort usually has several **test objectives** at once. The typical ones:

| Objective | Example on a sign-up form |
|---|---|
| Evaluate work products | Review the sign-up story before it is coded |
| Cause failures and find defects | Try an e-mail without "@" and see what breaks |
| Reach the required coverage | Every acceptance criterion has at least one test |
| Reduce the risk of poor quality | Test the password rules hardest: they protect accounts |
| Verify the requirements are met | "Password of 8–72 characters" really accepts 8 and 72 |
| Check legal or contractual rules | The privacy consent box is required |
| Inform decisions | "Two minor bugs open, no blockers: ready to release" |
| Build confidence | The full happy path passes on every supported browser |
| Validate it meets users' needs | Real users can finish sign-up without help |

Which objectives matter most depends on the context: the product, the risks, the development model and the business (a bank and a game prioritise differently).

## Why it is worth the cost

| Found during | Typical cost to fix |
|---|---|
| Requirements review | Minutes: change a sentence |
| Development | Hours: change code you just wrote |
| Testing | Hours to days: fix, rebuild, retest |
| Production | Days, plus support, data repair and reputation |

The later a problem is found, the more it costs. That is why testing starts **before** code exists: reviewing requirements is testing too (**static testing**); running the software is **dynamic testing**.

## Testing is not debugging

Testing and debugging are different activities, often done by different people:

1. **Testing** shows that something is wrong: a test triggers a failure (dynamic testing) or a review spots a defect directly (static testing).
2. **Debugging** is the developer's work after a failure: reproduce it, find the defect that causes it (diagnosis), fix it.
3. **Confirmation testing** (retest) checks the fix, ideally by the person who found the failure; **regression testing** checks that the fix broke nothing else.

When a review finds a defect, there is nothing to reproduce or diagnose: the defect is already visible, so it is simply corrected.

## Verification and validation

* **Verification**: are we building the product right? (Does it match the specification?)
* **Validation**: are we building the right product? (Does it solve the user's problem?)

A feature can pass verification and still fail validation: it matches the spec, but the spec was wrong.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 1.1 "What is testing?" and 1.2 "Why is testing necessary?". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: testing gives the team information to decide, through many objectives at once. It finds problems; debugging fixes them. Testing reduces the risk of failure in use, but it cannot prove there are no defects.
