# Curriculum

The V1 curriculum, as imported from `backend/seed/curriculum/` (`npm run seed:curriculum`; format and writing rules in `backend/seed/README.md`). Every text exists in English and Vietnamese. After the import the content is edited in the Admin CMS, so the live content may differ from this outline; regenerate this page when the files change.

Totals: 7 skills, 8 courses, 21 modules, 51 lessons, 123 exercises (53 multiple choice, 39 classification, 6 bug report, 14 scenario, 11 test case).

The `fundamentals`, `testing_types` and `test_design` courses follow the ISTQB CTFL syllabus v4.0.1 (chapters 1–4) and cite their sources in each lesson's Sources section. No subject-matter review by a person yet. Sources, licences and coverage: [docs/content-sources/](content-sources/quality_report.md).

## QA Fundamentals (`fundamentals`)

### QA fundamentals: first steps — `qa-fundamentals-first-steps`

What software testing is, why it matters, and how a tester works through a release.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| What testing is | Why we test | 9 | multiple choice, classification |
| What testing is | Errors, defects and failures | 8 | classification, bug report |
| How testing is done | The seven testing principles | 9 | multiple choice, scenario |
| How testing is done | STLC: the test process | 12 | test case |
| How testing is done | Testware, traceability and test roles | 10 | classification, multiple choice, multiple choice |
| How testing is done | Tester skills, the whole team and independence | 9 | classification, multiple choice, scenario |

### SDLC and the tester's role — `sdlc-and-the-tester`

How software is built in waterfall, V-model and Agile teams, where testing fits in each, and how a tester protects quality before any code runs.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| Development life cycles | SDLC models: waterfall, V-model, iterative | 9 | classification, multiple choice, multiple choice |
| Development life cycles | Agile and Scrum for testers | 10 | classification, multiple choice, test case |
| Development life cycles | Test-first, DevOps, shift left and retrospectives | 11 | classification, multiple choice, multiple choice |
| Quality in the team | QA vs QC vs testing | 7 | classification, multiple choice |
| Quality in the team | Static testing and reviews | 10 | multiple choice, scenario |
| Quality in the team | The review process and its roles | 9 | classification, multiple choice, scenario |

## Testing Types (`testing_types`)

### Testing levels and types — `testing-levels-and-types`

Where testing happens (unit to acceptance), what it checks (functional and non-functional), and which tests to run when the code changes.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| Test levels | Unit, integration, system and acceptance testing | 11 | classification, multiple choice, multiple choice |
| Test levels | Functional vs non-functional, black-box vs white-box | 10 | classification, multiple choice |
| Change-related testing | Regression testing vs retesting | 9 | classification, multiple choice, scenario |
| Change-related testing | Smoke vs sanity testing | 8 | classification, multiple choice |
| Change-related testing | Maintenance testing | 9 | classification, multiple choice, scenario |
| Non-functional testing | Performance testing basics | 10 | classification, multiple choice |
| Non-functional testing | Usability, accessibility and security basics | 11 | multiple choice, test case |

## Test Design Techniques (`test_design`)

### Test design techniques — `test-design-techniques`

Turn a requirement into a small, strong set of tests: equivalence partitioning, boundary values, decision tables, state transitions, use cases, statement and branch coverage, ATDD, error guessing, exploratory and checklist-based testing.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| Input techniques | Equivalence partitioning | 9 | classification, multiple choice, test case |
| Input techniques | Boundary value analysis | 9 | multiple choice, classification, test case |
| Logic and behaviour | Decision tables | 11 | multiple choice, scenario |
| Logic and behaviour | State transition testing | 12 | classification, scenario |
| Logic and behaviour | Use case testing | 8 | multiple choice, test case |
| Code coverage and collaboration | Statement and branch coverage | 10 | multiple choice, multiple choice, multiple choice |
| Code coverage and collaboration | User stories, acceptance criteria and ATDD | 10 | classification, multiple choice, scenario |
| Experience-based techniques | Error guessing and exploratory testing | 11 | multiple choice, classification, scenario |
| Experience-based techniques | Positive vs negative testing and choosing a technique | 9 | classification, multiple choice |

## Test Documentation (`test_docs`)

### Test documentation — `test-documentation`

Plan the testing, write test cases others can run, trace them to requirements and report the results so the team can decide whether to release.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| Planning the testing | Test plan and test strategy | 10 | classification, multiple choice |
| Planning the testing | Test scenarios, test cases and test suites | 8 | classification, multiple choice, test case |
| Writing test cases | Anatomy of a good test case | 10 | multiple choice, classification, test case |
| Writing test cases | Traceability and the RTM | 8 | multiple choice, test case |
| Reporting | Test execution and the test summary report | 10 | multiple choice, scenario |

## Defect Management (`defect_mgmt`)

### Defect management — `defect-management`

Write bug reports that get fixed, rate severity and priority correctly, and follow a bug from New to Closed.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| Bug reports | Anatomy of a bug report | 9 | multiple choice, classification, bug report |
| Bug reports | Severity vs priority | 9 | classification, multiple choice, bug report |
| Bug reports | Writing bug reports that get fixed | 8 | classification, multiple choice, bug report |
| The bug lifecycle | Bug lifecycle states | 8 | classification, multiple choice |
| The bug lifecycle | Triage and the other outcomes | 10 | classification, scenario |

## API Testing (`api_testing`)

### API testing — `api-testing`

How HTTP works from a tester's point of view, and how to test an API: authentication, negative and boundary cases, schemas and contracts. Practise on the QA Learning Lab API itself.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| HTTP for testers | Requests and HTTP methods | 9 | multiple choice, classification |
| HTTP for testers | Status codes and headers | 10 | multiple choice, classification, multiple choice |
| HTTP for testers | Parameters, request and response bodies | 9 | classification, multiple choice |
| Testing an API | Authentication and authorization | 10 | classification, multiple choice, bug report |
| Testing an API | Negative and boundary testing of an API | 11 | test case, bug report |
| Testing an API | Schema validation and contract testing | 10 | classification, scenario |

## Automation Testing (`automation`)

### Test automation — `test-automation`

Decide what to automate, write UI and API tests that stay reliable, and run them in CI/CD. Playwright is the tool used in the examples; the principles apply to any tool.

| Module | Lesson | Min | Exercises |
|---|---|---|---|
| Automation strategy | What to automate and what not to | 8 | classification, multiple choice |
| Automation strategy | The automation pyramid | 8 | classification, multiple choice |
| Writing automated tests | UI automation and the Page Object Model | 10 | classification, multiple choice, multiple choice |
| Writing automated tests | API automation, test data and fixtures | 10 | multiple choice, test case |
| Writing automated tests | Assertions and wait strategies | 9 | multiple choice, multiple choice |
| Keeping tests healthy | Flaky tests and test isolation | 9 | classification, scenario |
| Keeping tests healthy | Automation in CI/CD | 9 | classification, multiple choice |
