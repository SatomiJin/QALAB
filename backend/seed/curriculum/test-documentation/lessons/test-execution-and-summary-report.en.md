Execution is where the plan meets the product. What you record while running tests becomes the evidence for the most important question of the release: **can we ship?** This lesson covers how to record results honestly, which numbers to report, and how to turn them into a test summary report with a clear go/no-go recommendation.

## Verdicts in practice

| Verdict | Use it when | Record |
|---|---|---|
| Pass | The actual result matches the expected result | Date, build, tester; evidence for critical cases |
| Fail | The actual result differs from the expected result | The actual result and a link to the bug report |
| Blocked | The case cannot be run because of something outside it | What blocks it (a bug, a missing environment, missing data) |
| Not run | The case was planned but not executed yet | The reason, if it will not be run (descoped, no time) |

Two rules make verdicts trustworthy. First, a case is **Blocked**, not Fail, when it cannot reach its own check: if the login bug stops you from reaching checkout, the checkout cases are Blocked by that bug, and only the login case is Fail. Second, verdicts belong to a **build**: when a fix arrives, the failed case is rerun on the new build (a **retest**), and nearby cases are rerun to make sure the fix broke nothing (**regression**). The old verdict stays in the history.

## The execution log

Every run is recorded, so anyone can see what was tested, on what, and by whom.

| Test case | Build | Date | Tester | Verdict | Notes |
|---|---|---|---|---|---|
| TC-CHK-010 | 2.4.0-rc1 | 10 Mar | Anna | Fail | Total 46.00 USD, expected 45.00 USD; BUG-201 |
| TC-CHK-011 | 2.4.0-rc1 | 10 Mar | Anna | Pass | |
| TC-PAY-003 | 2.4.0-rc1 | 10 Mar | Ben | Blocked | Payment sandbox down |
| TC-CHK-010 | 2.4.0-rc2 | 12 Mar | Anna | Pass | Retest of BUG-201 |

## Metrics

| Metric | Formula | Tells you |
|---|---|---|
| Execution progress | (Pass + Fail) ÷ planned | How much of the plan was actually run |
| Pass rate | Pass ÷ (Pass + Fail) | How much of what was run works |
| Blocked / not run | count | What you could not check, and why |
| Defects by severity | open and fixed, per severity | How bad the remaining problems are |

In this course a case counts as **executed** when it has a Pass or Fail verdict; Blocked and Not run cases were not executed. Example: 120 cases planned, 90 Pass, 10 Fail, 8 Blocked, 12 Not run. Executed = 100, execution progress = 100 ÷ 120 ≈ 83 %, pass rate = 90 ÷ 100 = 90 %.

No single number is enough. A 98 % pass rate with one open critical defect in payment is worse than 90 % with only minor cosmetic bugs. And a high pass rate over half of the plan hides everything in the other half. Always read the pass rate together with execution progress and **open defects by severity**.

## Progress reports and completion reports

The ISTQB syllabus distinguishes two kinds of test report:

| | Test progress report | Test completion report |
|---|---|---|
| When | Regularly during testing (daily, weekly) | Once, when a level, cycle, iteration or project ends |
| Purpose | Support test control: change the schedule, resources or plan when needed | Summarise the activity and inform the next one |
| Typical content | Period, progress and deviations, impediments and workarounds, metrics, new or changed risks, plan for the next period | Summary, evaluation against objectives and exit criteria, deviations from the plan, impediments, metrics, unmitigated risks and unfixed defects, lessons learned |

What this course calls the **test summary report** is the completion report. Choose the channel for the audience: a quick word or chat inside the team, a dashboard (CI results, task board, burn-down chart), or a formal report for management and distributed teams.

## The test summary report

Written at the end of a test cycle, for people who will not read the test cases: the product owner, the release manager, the developers.

| Section | Content |
|---|---|
| Scope | What was tested, on which build and environment, and what was not |
| Results | Planned, executed, Pass, Fail, Blocked, Not run, pass rate |
| Defects | Open and fixed defects by severity, the important ones by name |
| Exit criteria | Each criterion from the test plan: met or not met |
| Risks | What remains untested or uncertain, and what it could cost |
| Recommendation | Go, no-go or conditional go, with the reason |

## Example summary report

| Section | Release 2.4 (build 2.4.0-rc2, staging) |
|---|---|
| Scope | Discount codes and checkout on web; mobile out of scope |
| Results | 120 planned, 110 executed: 106 Pass, 4 Fail; 6 Blocked, 4 Not run; pass rate 96 % |
| Defects | 0 critical, 0 major open; 3 minor open (layout); 12 fixed and retested |
| Exit criteria | High-priority cases all executed: met. Pass rate ≥ 95 %: met. No open critical or major: met |
| Risks | 6 payment cases blocked by sandbox downtime; covered by API tests with a mocked provider |
| Recommendation | **Go**, with the 3 minor bugs planned for 2.4.1 and the 6 blocked cases run on production smoke after release |

## Go/no-go recommendation

QA gives a **recommendation** based on evidence; the release decision belongs to the product owner or release manager, who also weighs business reasons. A good recommendation:

* compares the results with the **exit criteria** from the test plan;
* names the open defects that matter by severity, not only a count;
* states the **risks** of what was not tested (blocked, not run, out of scope);
* says clearly *go*, *no-go*, or *go with conditions*, and what would change it ("no-go until BUG-230 is fixed and retested").

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 5.3.1 "Metrics used in testing", 5.3.2 "Purpose, content and audience for test reports" and 5.3.3 "Communicating the status of testing". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: record a verdict per build for every run, report pass rate together with execution progress and open defects by severity, check the exit criteria, and end the summary report with a clear go/no-go recommendation and its reasons.
