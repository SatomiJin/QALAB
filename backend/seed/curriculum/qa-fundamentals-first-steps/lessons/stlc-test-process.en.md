The **Software Testing Life Cycle (STLC)** is the sequence of activities a tester goes through for a release. It runs alongside the development life cycle (SDLC), not after it.

## Phases

| Phase | Main question | Output |
|---|---|---|
| Requirement analysis | What must be tested? | Testable requirements, questions |
| Test planning | How, by whom, when? | Test plan: scope, approach, risks, schedule |
| Test design | Which cases, with which data? | Test cases, test data |
| Environment setup | Where do we run them? | Ready test environment |
| Test execution | Does it behave as expected? | Results (Pass, Fail, Blocked), bug reports |
| Test closure | Are we done, what did we learn? | Test summary report |

## The same process in ISTQB terms

The phase names above are common in companies. The ISTQB syllabus describes the same work as seven groups of **test activities**, which often overlap or repeat in every iteration rather than run strictly one after another:

| ISTQB activity | Answers | Typical output (testware) |
|---|---|---|
| Test planning | What are the objectives and the approach? | Test plan, schedule, risk register, entry and exit criteria |
| Test monitoring and control | Are we on track, what do we change? | Progress reports, control decisions |
| Test analysis | **What** to test? | Prioritised test conditions, defects found in the requirements |
| Test design | **How** to test? | Test cases, test charters, test data and environment requirements |
| Test implementation | Is everything ready to run? | Test procedures, scripts, suites, test data, execution schedule, environment |
| Test execution | Does it behave as expected? | Test logs, defect reports |
| Test completion | What did we learn, what do we hand over? | Test completion report, lessons learned, archived testware |

How much of each activity a team does depends on the context: a regulated bank writes it all down, a small Agile team may keep most of it in the backlog and the CI pipeline.

## Entry and exit criteria

Each phase has **entry criteria** (what must be true to start) and **exit criteria** (what must be true to finish). For example, execution can start when the build is deployed and smoke tests pass; it can end when all high-priority cases are run and no critical bugs are open.

## Verdicts

During execution every test case gets a verdict:

* **Pass**: actual result matches the expected result.
* **Fail**: it does not; a bug report is written.
* **Blocked**: the case cannot be run (for example, a login bug blocks everything after login).
* **Not run**: not executed yet.

This app uses the same verdicts for your own progress.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 1.4.1 "Test activities and tasks", 1.4.2 "Test process in context" and 1.4.3 "Testware". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. The company-style STLC phases are common industry practice, not ISTQB terms; the explanations are the QALAB team's own.
