# Quality report: batch 1 (courses 1 and 2)

Date: 2026-10-06. Every lesson below has: an intro, worked examples written by the team, exercises with explanations, a Sources section, English and Vietnamese. QALAB lessons have no separate "learning objectives" field, so the objectives are the ISTQB learning objectives (FL-x.y.z) each lesson covers.

**Review status:** written and validated by Claude, **not yet reviewed by a person**. All 12 lessons are published (the 4 new ones were published in the Admin CMS on 2026-10-06; the files now import them as published too).

## Coverage of ISTQB CTFL v4.0.1 chapters 1–3

### `qa-fundamentals-first-steps`

| Lesson | Status | Change | ISTQB objectives | Exercises |
|---|---|---|---|---|
| Why we test | published | Updated: test objectives table, testing vs debugging, static vs dynamic | FL-1.1.1, 1.1.2, 1.2.1 | multiple choice, classification (new) |
| Errors, defects and failures | published | Updated: where defects live, environmental causes, root cause analysis | FL-1.2.3 | classification, bug report |
| The seven testing principles | published | Fixed: principle 7 is "absence-of-defects fallacy" in v4 (was "absence-of-errors"); principles 2–5 explained as in v4 | FL-1.3.1 | multiple choice, scenario |
| STLC: the test process | published | Added: the seven ISTQB activity groups and their testware, impact of context | FL-1.4.1, 1.4.2 | test case |
| Testware, traceability and test roles | published, new | New | FL-1.4.3, 1.4.4, 1.4.5 | classification, multiple choice ×2 |
| Tester skills, the whole team and independence | published, new | New | FL-1.5.1, 1.5.2, 1.5.3 | classification, multiple choice, scenario |

### `sdlc-and-the-tester`

| Lesson | Status | Change | ISTQB objectives | Exercises |
|---|---|---|---|---|
| SDLC models | published | Sources added | FL-2.1.1, 2.1.2 | classification, multiple choice ×2 |
| Agile and Scrum for testers | published | Sources added (ISTQB + Scrum Guide) | FL-2.1.1, 2.1.5 (intro), 1.5.2 | classification, multiple choice, test case |
| Test-first, DevOps, shift left and retrospectives | published, new | New | FL-2.1.3, 2.1.4, 2.1.5, 2.1.6 | classification, multiple choice ×2 |
| QA vs QC vs testing | published | Sources added | FL-1.2.2 | classification, multiple choice |
| Static testing and reviews | published | Sources added | FL-3.1.1, 3.1.2, 3.1.3, 3.2.4 | multiple choice, scenario |
| The review process and its roles | published, new | New | FL-3.2.1, 3.2.2, 3.2.3, 3.2.5 (3.2.4 recap) | classification, multiple choice, scenario |

## Gaps and points to check

1. **FL-2.3.1 Maintenance testing** (triggers: modification, migration, retirement; impact analysis) is not taught anywhere in the curriculum. Candidate: a short lesson in `testing-levels-and-types`, next to regression vs retesting.
2. FL-2.2.x (test levels, test types, confirmation vs regression) is covered by the `testing-levels-and-types` course, not checked line by line against v4.0.1 in this batch.
3. The new lessons overlap a little with existing ones on purpose (shift left is introduced in the Agile lesson and detailed in the new one; review types are listed in the static testing lesson and recapped in the review process lesson). A reviewer may want to trim.
4. The "cost to fix by phase" table in *Why we test* is illustrative, not a figure from the syllabus (the syllabus only states the principle, citing Boehm 1981).
5. Free-text exercises are graded by keywords; the importer checked that both model answers reach 70 %. A reviewer should still try a few answers in Vietnamese.

## Before publishing (per `documentforQA.md` §5)

- [x] Source URLs work and match the topic.
- [x] Publisher, version and verification date recorded (`sources_manifest.csv`).
- [x] Licence / terms checked (`license_review.md`).
- [x] Explanations written by the team; examples and exercises self-written.
- [x] No secrets, personal or production data.
- [ ] Answers verified by a person.
- [ ] Subject-matter review by a person.
- [x] Imported and checked against the database (not yet looked at on screen).

## Import

Imported on 2026-10-06 with `npm run seed:curriculum` and `npm run seed:curriculum -- --update` (both write to the shared cloud database). A read-only check against the database the same day found every lesson of both courses matching the files: English text, manual Vietnamese translation (current source hash), exercise count with Vietnamese texts, minutes and order. The 4 new lessons were then published in the Admin CMS, and the files were changed to import them as published, so a later `--update` keeps them visible.

# Batch 2: courses 3 and 4

Date: 2026-10-06. All lessons import as published (no draft status). No subject-matter review by a person yet.

### `testing-levels-and-types`

| Lesson | Change | ISTQB objectives / source | Exercises |
|---|---|---|---|
| Unit, integration, system and acceptance testing | Added: ISTQB's five levels (component integration and system integration separate), what distinguishes levels | FL-2.2.1 | unchanged |
| Functional vs non-functional, black-box vs white-box | Added: the eight ISO/IEC 25010 characteristics listed by the syllabus | FL-2.2.2 | unchanged |
| Regression testing vs retesting | Sources added | FL-2.2.3 | unchanged |
| Smoke vs sanity testing | Added: some references treat the terms as synonyms; sources (industry practice) | not in CTFL | unchanged |
| Maintenance testing | **New** | FL-2.3.1 | classification, multiple choice, scenario |
| Performance testing basics | Sources added (CTFL 2.2.2 + industry practice) | FL-2.2.2 (partly) | unchanged |
| Usability, accessibility and security basics | Sources added (CTFL, WCAG 2.2, OWASP Top 10:2025) | FL-2.2.2 (partly) | unchanged |

### `test-design-techniques`

| Lesson | Change | ISTQB objectives / source | Exercises |
|---|---|---|---|
| Equivalence partitioning | Added: Each Choice coverage for several inputs | FL-4.2.1 | unchanged |
| Boundary value analysis | Sources added (already covered 2- and 3-value BVA) | FL-4.2.2 | unchanged |
| Decision tables | Added: ISTQB notation, limited / extended entry, coverage of feasible columns | FL-4.2.3 | unchanged |
| State transition testing | Added: all states / valid transitions / all transitions coverage, defect masking, `event [guard] / action` | FL-4.2.4 | unchanged |
| Use case testing | Sources added: removed from CTFL v4, still in Advanced Test Analyst; kept on purpose | not in CTFL v4 | unchanged |
| Statement and branch coverage | **New** | FL-4.3.1, 4.3.2, 4.3.3 | multiple choice ×3 |
| User stories, acceptance criteria and ATDD | **New** | FL-4.5.1, 4.5.2, 4.5.3 | classification, multiple choice, scenario |
| Error guessing and exploratory testing | Added: checklist-based testing | FL-4.4.1, 4.4.2, 4.4.3 | unchanged |
| Positive vs negative testing and choosing a technique | Added: black-box / white-box / experience-based families, rows and coverage for the new techniques | FL-4.1.1 | unchanged |

### Points to check

1. The ISTQB glossary could not be read (JavaScript app): confirm by hand how it defines smoke and sanity test.
2. The existing exercises of the edited lessons were not changed; they still match the lesson text (the additions do not contradict them).
3. FL-4.2.x coverage formulas are explained in words; a reviewer may want worked coverage percentages in exercises.
4. The ATDD lesson overlaps a little with *Agile and Scrum for testers* (user stories, acceptance criteria) and *Test-first, DevOps, shift left* (ATDD intro); the new lesson goes deeper (3 C's, INVEST, criteria formats, deriving test cases).

# Batch 3: courses 5 and 6

Date: 2026-10-06. All lessons import as published. No subject-matter review by a person yet.

### `test-documentation`

| Lesson | Change | ISTQB objectives / source | Exercises |
|---|---|---|---|
| Test plan and test strategy | Added: other test plan parts (context, assumptions, stakeholders, communication, budget), time or budget as exit criteria when the risk is accepted, Definition of Ready / Done | FL-5.1.1, 5.1.3 | unchanged |
| Risk-based testing | **New** | FL-5.2.1–5.2.4 | classification, multiple choice, scenario |
| Estimating and prioritising tests | **New** | FL-5.1.2, 5.1.4, 5.1.5 | multiple choice, classification, multiple choice |
| Test scenarios, test cases and test suites | Sources added ("test scenario" is an industry term) | FL-1.4.1 | unchanged |
| Anatomy of a good test case | Sources added (industry template) | FL-1.4.3 | unchanged |
| Traceability and the RTM | Added: configuration management, baselines | FL-1.4.4, 5.4.1 | unchanged |
| Test execution and the test summary report | Added: progress vs completion reports, communication channels | FL-5.3.1–5.3.3 | unchanged |

### `defect-management`

| Lesson | Change | ISTQB objectives / source | Exercises |
|---|---|---|---|
| Anatomy of a bug report | Added: the three objectives of a defect report, fields trackers fill in, static-testing defects | FL-5.5.1 | unchanged |
| Severity vs priority | Sources added | FL-5.5.1 | unchanged |
| Writing bug reports that get fixed | Sources added | FL-1.5.1, 5.5.1 | unchanged |
| Bug lifecycle states | Sources added (state names are tool conventions) | FL-5.5 | unchanged |
| Triage and the other outcomes | Added: anomaly, false positive, change request | FL-5.5, 5.3.1 | unchanged |
| Tracking bugs in Jira | **New** | Atlassian docs + FL-5.5 | classification, multiple choice ×2 |

### Points to check

1. `test-execution-and-summary-report` (about 1 100 words counting table markup) and `test-plan-and-strategy` (about 990) are now above the 900-word guideline; a reviewer may split or trim them.
2. Jira field names and defaults change over time and between instances; re-check the Jira lesson against the team's real Jira.
3. CTFL 5.1.6 (test pyramid) and 5.1.7 (testing quadrants) belong to the automation course batch.

# Batch 4: courses 7 and 8

Date: 2026-10-07. All lessons import as published. No subject-matter review by a person yet.

### `api-testing`

| Lesson | Change | Source | Exercises |
|---|---|---|---|
| Requests and HTTP methods | Sources added | RFC 9110 §9 | unchanged |
| Status codes and headers | Sources added | RFC 9110 §15 | unchanged |
| Parameters, request and response bodies | Sources added | RFC 9110 | unchanged |
| Authentication and authorization | Sources added | RFC 6750, RFC 7519, OWASP Top 10:2025 A01 | unchanged |
| Negative and boundary testing of an API | Sources added | CTFL 4.2.1–4.2.2, RFC 9110 §15.5 | unchanged |
| Schema validation and contract testing | Sources added | JSON Schema 2020-12, OpenAPI 3.2.1 | unchanged |
| Testing APIs with Postman | **New** | Postman Learning Center v12 | classification, multiple choice ×2 |

### `test-automation`

| Lesson | Change | Source | Exercises |
|---|---|---|---|
| What to automate and what not to | Added: benefits and risks of automation, kinds of test tools | CTFL 6.1–6.2 | unchanged |
| The automation pyramid | Added: testing quadrants Q1–Q4 | CTFL 5.1.6–5.1.7 | unchanged |
| Getting started with Playwright | **New** | Playwright docs | classification, multiple choice ×2 |
| UI automation and the Page Object Model | Sources added | Playwright: locators, POM | unchanged |
| API automation, test data and fixtures | Sources added | Playwright: API testing, fixtures | unchanged |
| Assertions and wait strategies | Sources added | Playwright: actionability, assertions | unchanged |
| Flaky tests and test isolation | Sources added | Playwright: browser contexts, mocks, retries; CTFL 6.2 | unchanged |
| Automation in CI/CD | Sources added | Playwright: parallelism, sharding, trace viewer, CI; CTFL 2.1.4 | unchanged |

### Points to check

1. `what-to-automate` (about 980 words counting table markup) and `automation-pyramid` (about 930) are above the 900-word guideline.
2. Postman's UI and CLI change often (docs are at v12); re-check the Postman lesson against the installed version before a workshop.
3. The Playwright Node.js requirement (22.x, 24.x, 26.x) will change; the lesson says "currently".
4. With this batch every CTFL v4.0.1 learning objective of chapters 1–6 is covered by at least one lesson.
