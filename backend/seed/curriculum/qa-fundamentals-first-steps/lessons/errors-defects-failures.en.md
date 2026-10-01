Three words describe the chain from a human mistake to a visible problem. Bug reports and test reports use them precisely.

## The chain

1. **Error (mistake)**: a person does something wrong. A developer misreads "at least 18" as "more than 18".
2. **Defect (bug, fault)**: the result in a work product. The code says `age > 18` instead of `age >= 18`.
3. **Failure**: the system does something it should not, when the defect is executed. An 18-year-old cannot register.

Not every defect causes a failure: if no one aged exactly 18 ever registers, the failure never shows up. That is why **boundary values** are tested on purpose.

## Root cause

The **root cause** is the earliest reason for the error: unclear requirements, time pressure, missing review. Fixing the defect removes one bug; fixing the root cause prevents the next ones.

## Example

| | Example |
|---|---|
| Error | The requirement "free shipping from $50" was read as "over $50" |
| Defect | `if (total > 50)` in the checkout code |
| Failure | A $50.00 order is charged shipping |
| Root cause | The requirement did not give an example at the boundary |

> In a bug report you describe the **failure** (what you observed). Developers find the **defect**.
