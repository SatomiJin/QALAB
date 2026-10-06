Every bug report carries two ratings, and beginners often treat them as one. They answer different questions: **severity** asks *how much damage does this bug do to the system?*, **priority** asks *how soon must we fix it?* Most of the time they move together, but the interesting bugs are the ones where they do not.

## Severity: impact on the system

Severity describes the effect of the failure on the product and its users, regardless of deadlines or business plans. This app uses four levels:

| Severity | Meaning | Example |
|---|---|---|
| Critical | The system or a core function is unusable, data is lost or corrupted, a security hole is open; no workaround | Checkout crashes for every order; an API returns other users' data |
| Major | An important function fails or gives wrong results; a workaround exists or only part of the users are hit | A 15 % discount is applied as 10 %; search ignores the category filter |
| Minor | A small function misbehaves; easy workaround, little impact | Sorting by date ignores the time of day; a `.JPG` file is rejected but `.jpg` works |
| Trivial | Cosmetic: no effect on how the system works | A typo in a label, a misaligned icon, a wrong shade of grey |

Severity is mostly a **technical judgement**. The tester proposes it when reporting, because the tester saw the failure and its impact; developers and the test lead may correct it.

## Priority: urgency of the fix

Priority describes the order in which bugs are fixed, based on business needs: release dates, how many customers are affected, contracts, reputation.

| Priority | Meaning |
|---|---|
| High | Fix now or before the next release; other work waits |
| Medium | Fix in the normal course of work, e.g. the next sprint |
| Low | Fix when there is time; may be deferred |

Priority is a **business decision**. The tester may suggest it, but the product owner, project manager or the triage meeting sets it, because they know the plans and the customers.

## The classic combinations

| | High priority | Low priority |
|---|---|---|
| **High severity** | The payment page crashes for all users in production | The app crashes when a report is exported in a legacy format that one internal user opens once a year |
| **Low severity** | The company name is misspelled on the home page the day before launch | A tooltip on a rarely used admin page has a typo |

The two diagonal cases are the ones to remember:

* **High severity, low priority**: the damage is real, but it happens in a place almost nobody reaches, or the feature is being removed next month. It is recorded honestly as critical or major, and scheduled later.
* **Low severity, high priority**: nothing is broken technically, but the business impact is large: a misspelled brand name, a wrong price in a marketing banner, a legal text missing before an audit. It is trivial or minor, and still fixed today.

## Common mistakes

* **Using one to set the other.** "It is critical, so it is high priority" skips the question. Rate each one on its own.
* **Inflating severity to get attention.** If every bug is critical, the word stops meaning anything and the real critical bugs wait in the queue. Rate the impact honestly and argue for priority separately.
* **Judging severity by effort.** A one-line fix can be critical; a hard-to-fix bug can be trivial.
* **Forgetting that priority changes.** A low-priority bug can become high when a big customer starts using the feature. Severity changes only if the impact itself changes.

## How to decide quickly

For severity, ask: *Does it stop a core function? Lose or expose data? Is there a workaround? How many users can hit it?* For priority, ask: *When is the release? Who is affected and how visible is it? What does it cost the business each day it stays?*

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 5.5 "Defect management" (severity as degree of impact, priority to fix). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: severity is the impact on the system, set mostly by the tester; priority is the urgency of the fix, set by the business. Rate them separately, every time.
