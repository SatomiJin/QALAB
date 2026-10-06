Three words describe the chain from a human mistake to a visible problem. Bug reports and test reports use them precisely.

## The chain

1. **Error (mistake)**: a person does something wrong. A developer misreads "at least 18" as "more than 18".
2. **Defect (bug, fault)**: the result in a work product. The code says `age > 18` instead of `age >= 18`.
3. **Failure**: the system does something it should not, when the defect is executed. An 18-year-old cannot register.

Not every defect causes a failure: if no one aged exactly 18 ever registers, the failure never shows up. Some defects fail every time they run, some only in special conditions, and some never. That is why **boundary values** are tested on purpose.

## Where defects live

People make errors for ordinary reasons: time pressure, complex work, unfamiliar technology, tiredness, missing training. The defects they leave are not only in code:

* a requirement or user story (a missing rule, a contradiction),
* a design or API specification,
* a test script or test data (the test itself is wrong),
* a build or configuration file.

A defect in an early work product spreads: a wrong requirement leads to a wrong design, wrong code and wrong tests. Finding it in the requirement is the cheapest fix.

Failures can also have causes outside the software. Environmental conditions such as radiation, magnetic fields or a hardware fault can corrupt data or firmware. Before you report a failure as a bug, check that the environment was sound.

## Root cause

The **root cause** is the fundamental reason behind the error: unclear requirements, time pressure, missing review. **Root cause analysis** is done when a failure happens or a defect is found. Fixing the defect removes one bug; removing the root cause prevents the next similar ones, or makes them rarer.

## Example

| | Example |
|---|---|
| Error | The requirement "free shipping from $50" was read as "over $50" |
| Defect | `if (total > 50)` in the checkout code |
| Failure | A $50.00 order is charged shipping |
| Root cause | The requirement did not give an example at the boundary |

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 1.2.3 "Errors, defects, failures, and root causes". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> In a bug report you describe the **failure** (what you observed). Developers find the **defect**; root cause analysis finds why it was made.
