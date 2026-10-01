Test automation means a program runs checks for you and reports pass or fail. It is a tool, not a goal: an automated test costs time to write and more time to keep working. A good QA engineer automates where that cost pays back and keeps people on the work that needs human judgement.

## Automation is an investment

Every automated test has a price:

* **Writing it**: designing the check, finding stable locators, preparing test data.
* **Maintaining it**: every time the feature or the screen changes, the test may need an update.
* **Running and investigating it**: machine time in CI, plus a person's time when it fails.

It pays back each time it runs and catches a **regression** (something that used to work and broke) faster and cheaper than a person would. This is the **return on investment (ROI)**. A rough way to think about it:

* A check you run once a year saves almost nothing.
* A check you run on every pull request, 20 times a day, saves hours every week.

## Good candidates

Automate checks that are:

| Property | Why it pays off | Example |
| --- | --- | --- |
| **Repetitive** | Runs many times, so the cost is shared across runs | Login, sign-up, checkout in every regression run |
| **Stable** | The feature and the screen rarely change, so maintenance is low | A tax calculation rule that has not changed for two years |
| **High risk** | A failure costs money or trust, so you want it checked on every change | Payment amount, password reset, permissions |
| **Data heavy** | Many inputs, same steps: a machine does not get bored | 50 combinations of country and currency for shipping cost |
| **Hard by hand** | Precise or fast actions a person cannot do reliably | 200 parallel API calls, checking every field of a JSON response |

**Smoke tests** (a short set that proves the main flows work) and **regression suites** are the classic first targets.

## Poor candidates

Keep these manual, at least for now:

| Kind of testing | Why automation does not fit |
| --- | --- |
| **Exploratory testing** | Its value is a person thinking, noticing and following hunches. A script only checks what it was told to check. |
| **Usability and look-and-feel** | "Is this confusing?" or "Does this feel slow?" needs a human. A script can check that a button exists, not that users find it. |
| **One-off checks** | A data migration verified once: writing the script costs more than doing it. |
| **Features that change every week** | A new screen still being redesigned breaks its tests every sprint. Wait until it settles. |
| **Checks with no clear expected result** | If you cannot write down pass or fail, a machine cannot decide it either. |

Not automating something is a decision, not a failure. Write down why, and look again when the situation changes (the feature becomes stable, the check starts running weekly).

## A quick decision checklist

Before automating a check, ask:

1. How often will it run? (Every pull request, every release, once?)
2. How likely is the feature to change in the next months?
3. What does a missed bug here cost?
4. Can the expected result be stated precisely?
5. Is there a cheaper level to check it at? (An API or unit test instead of a UI test, see the next lesson.)

A check that runs often, changes rarely, protects something important and has a precise expected result is a strong candidate.

## Common mistakes

* **"Automate 100 %."** Some testing cannot be automated, and chasing the number produces fragile tests nobody trusts.
* **Automating test cases one to one.** A manual test case written for a person is often long and mixes several checks. Split and redesign it for the machine.
* **Automating a broken process.** If nobody looks at the results, automation only produces red reports.

> Key idea: automate what is repetitive, stable, high risk and precisely checkable; keep exploratory, usability and one-off testing in human hands.
