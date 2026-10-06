From the moment you report it until it is closed, a bug moves through a series of **states**. The state tells everyone who has to act next: the tester, the lead, or the developer. Tools such as Jira, Azure DevOps or YouTrack name the states slightly differently, but the flow is almost always the one below.

## The states

| State | Meaning | Who acts next |
|---|---|---|
| New | Just reported, not yet reviewed | Test lead / triage |
| Assigned | Accepted as a real bug and given to a developer | Developer |
| In Progress | The developer is working on the fix | Developer |
| Fixed | The developer has changed the code; the fix is waiting for a build | Developer / build |
| Retest | The fix is in a build the tester can use | Tester |
| Verified | The tester confirmed that the failure is gone | Tester / lead |
| Closed | Nothing more to do | Nobody |
| Reopened | The fix did not work, or the bug came back | Developer |

## The transitions

The lifecycle is a state diagram: each arrow is an allowed move, made by a specific role.

| From | To | When | By |
|---|---|---|---|
| New | Assigned | The bug is valid and has an owner | Lead / triage |
| Assigned | In Progress | The developer starts on it | Developer |
| In Progress | Fixed | The code change is done and merged | Developer |
| Fixed | Retest | The fix is deployed to the test environment | Developer / release |
| Retest | Verified | The original steps pass and nearby checks pass | Tester |
| Retest | Reopened | The failure still happens | Tester |
| Verified | Closed | The fix is accepted (often when it is released) | Tester / lead |
| Closed | Reopened | The same failure comes back later | Tester |
| Reopened | Assigned | The bug goes back to a developer | Lead |

Read as a path, the happy flow is **New → Assigned → In Progress → Fixed → Retest → Verified → Closed**. Reopened sends the bug back into the loop.

Some teams merge states (Fixed and Retest are often one column, "Ready for QA"), and many add the outcomes of triage: Rejected, Duplicate, Cannot Reproduce, Won't Fix, Deferred. Those are the subject of the next lesson.

## The tester's part

The tester owns three moments of the lifecycle:

1. **New**: the quality of the report decides how fast the bug moves on.
2. **Retest**: you run the original steps again **on the build that contains the fix**, check that the build number matches, and run a few tests around the change, because a fix can break something nearby (that is **regression testing**).
3. **Verified / Reopened**: you decide. If the failure is gone, verify it. If it is still there, reopen it with a comment saying which build you used and what you saw.

## Reopen or new bug?

Reopen when **the same failure** with the same steps is still present, or comes back. Report a **new bug** when the fix works but you found a different problem, even in the same area: "the discount is now correct, but the total no longer includes shipping" is a new bug, linked to the old one. Reopening a bug for a different problem hides it in the history of the old one.

## Why states matter

States make the work visible. A dashboard can show how many bugs wait for a developer, how many wait for retest, and how long each step takes. A bug that stays in Retest for two weeks means testers are the bottleneck; a bug reopened three times means the fixes are not checked well enough before they come back.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 5.5 "Defect management" (a workflow from discovery to closure). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors.
* The state names follow common tracker conventions; every team and tool (Jira, Azure DevOps, YouTrack) configures its own. The explanations are the QALAB team's own.

> Key idea: the state of a bug says who acts next. The tester reports it (New), retests the fix (Retest) and then verifies or reopens it, based on the build that contains the fix.
