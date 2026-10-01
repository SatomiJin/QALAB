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

## Entry and exit criteria

Each phase has **entry criteria** (what must be true to start) and **exit criteria** (what must be true to finish). For example, execution can start when the build is deployed and smoke tests pass; it can end when all high-priority cases are run and no critical bugs are open.

## Verdicts

During execution every test case gets a verdict:

* **Pass**: actual result matches the expected result.
* **Fail**: it does not; a bug report is written.
* **Blocked**: the case cannot be run (for example, a login bug blocks everything after login).
* **Not run**: not executed yet.

This app uses the same verdicts for your own progress.
