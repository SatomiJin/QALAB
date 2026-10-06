Every test activity leaves something behind: a plan, a list of test cases, a log, a bug report. Together these work products are called **testware**. This lesson covers what testware a team produces, why linking it to the requirements (**traceability**) pays off, and who does which part of the work.

## Testware: what each activity produces

Organisations name and shape their documents differently, but the content is recognisable everywhere:

| Activity | Typical testware |
|---|---|
| Test planning | Test plan, test schedule, risk register, entry and exit criteria |
| Monitoring and control | Test progress reports, decisions taken to get back on track |
| Test analysis | Prioritised test conditions (for example acceptance criteria), defects found in the requirements |
| Test design | Test cases, test charters, coverage items, test data and environment requirements |
| Test implementation | Test procedures, manual and automated scripts, test suites, test data, execution schedule, stubs and simulators |
| Test execution | Test logs, defect reports |
| Test completion | Test completion report, lessons learned, improvement actions, change requests for open defects |

A **risk register** lists each risk with its likelihood, its impact and what is done about it. Testware changes as the product changes, so it is kept under **configuration management**: versioned, so that everyone knows which test cases belong to which release.

## Traceability: linking it all together

**Traceability** means keeping links between the **test basis** (requirements, user stories, risks) and the testware and results built on it:

```text
Requirement REQ-12  "Password must be 8-72 characters"
  └── Test condition  password length limits
        ├── TC-031  7 characters  → rejected   Pass
        ├── TC-032  8 characters  → accepted   Pass
        ├── TC-033  72 characters → accepted   Fail → BUG-207
        └── TC-034  73 characters → rejected   Pass
```

With these links the team can answer questions that would otherwise be guesses:

* **Coverage**: does every requirement have at least one test? REQ-15 has none, so it is untested.
* **Residual risk**: which risks are still uncovered or failing? REQ-12 has an open bug at the upper boundary.
* **Impact of a change**: the password rule changes to 10–64 characters; exactly TC-031 to TC-034 must be updated.
* **Reporting**: "11 of 12 requirements pass" means more to a manager than "143 of 150 test cases pass".
* **Audits**: in regulated work, proof that every requirement was tested is often mandatory.

In practice the links live in a test management tool, in Jira (a test linked to a story), or in a simple **traceability matrix**: requirements as rows, test cases as columns.

## Two roles in testing

The ISTQB syllabus describes two principal roles. They are roles, not job titles: one person can hold both, and different people can hold them at different times.

| | Test management role | Testing role |
|---|---|---|
| Responsible for | The test process, the test team, leading the test activities | The engineering (technical) side of testing |
| Main activities | Planning, monitoring and control, completion | Analysis, design, implementation, execution |
| Typical questions | Are we on schedule? What is the risk if we release now? | What do we test? How do we test it? Did it pass? |
| Who does it | A test manager, team lead, development manager, or the Agile team itself | Testers, QA engineers, often developers too |

In an Agile team, much of the test management work is shared by the team; work that spans many teams (a release strategy, test tooling) may sit with a test manager outside it. As a junior QA engineer you start in the testing role; writing clear testware and keeping traceability is what makes you ready for the management side.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 1.4.3 "Testware", 1.4.4 "Traceability between the test basis and testware" and 1.4.5 "Roles in testing". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: each test activity produces testware; traceability links it to requirements and risks so the team can see coverage, residual risk and the impact of a change. The test management role steers the process, the testing role does the technical work, and one person may do both.
