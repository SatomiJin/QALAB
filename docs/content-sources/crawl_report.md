# Crawl report: batch 1 (courses 1 and 2)

Date: 2026-10-06. Scope: the first two courses of the `fundamentals` skill, `qa-fundamentals-first-steps` and `sdlc-and-the-tester` (step 1 "QA Foundation" of the import order in `documentforQA.md`). Sources list: [sources_manifest.csv](sources_manifest.csv).

## Fetched successfully

| Source | How | Result |
|---|---|---|
| ISTQB CTFL v4.0 overview page | Web fetch | Title, current version v4.0.1, list of downloads (syllabus, sample exams A–D, exam rules, release notes). No usage terms on the page itself. |
| ISTQB CTFL syllabus v4.0.1 (PDF, 78 pages) | Direct download from istqb.org, text extracted locally (not committed) | Copyright notice and conditions of use (page 2), revision history (v4.0.1 errata of 15 Sep 2024), chapters 1–3 read in full. |
| The Scrum Guide (2020) | Web fetch | Version, authors, licence CC BY-SA 4.0, definitions of Definition of Done and Sprint Retrospective. |

## Not fetched, on purpose

| Source | Reason |
|---|---|
| ISTQB sample exams A–D | Exam questions and answer keys may not be copied into QALAB (see [license_review.md](license_review.md)). All exercises are written by the team. |
| ISTQB glossary (glossary.istqb.org) | Not needed for this batch: definitions come from the syllabus. Licence not checked; check before using it for `backend/seed/glossary`. |
| ISO/IEC 20246, ISO/IEC/IEEE 29119 | Paid standards. Only named where the syllabus names them. |
| Ministry of Testing, Atlassian, Postman, SQLBolt, Playwright, OWASP | Later courses (manual testing, Jira, API, SQL, automation, security), not part of this batch. |

## Errors

None. No paywall, login, robots or rate-limit issue met. The syllabus PDF and the extracted text stay in the agent's scratchpad and are not committed.

## Result

* 8 existing lessons checked against the syllabus; 4 updated in content, all 8 given a Sources section.
* 4 new lessons with 11 new self-written exercises, plus 1 new exercise in an existing lesson.
* Validated with `npm run seed:curriculum -- --dry-run` (48 lessons, 114 exercises, all valid) and `npx vitest run src/curriculum` (17 tests pass). Imported by the user afterwards and checked against the database (see [quality_report.md](quality_report.md#import)).

Details per lesson: [quality_report.md](quality_report.md).

# Batch 2: courses 3 and 4

Date: 2026-10-06. Scope: `testing-levels-and-types` and `test-design-techniques`.

| Source | How | Result |
|---|---|---|
| ISTQB CTFL syllabus v4.0.1 | Same local copy as batch 1 | Sections 2.2–2.3 and chapter 4 read in full; release notes (appendix) confirm that use case testing was removed from Foundation Level v4.0 and remains in the Advanced Test Analyst syllabus. |
| WCAG 2.2 (w3.org) | Web fetch | W3C Recommendation of 12 December 2024, four principles, levels A / AA / AAA, copyright line. |
| OWASP Top 10:2025 | Web search | Current edition (released November 2025) and its ten categories. Licence not read page by page. |
| ISTQB glossary, term "smoke test" | Web fetch | **Failed**: the glossary is a JavaScript application and returned no content. Secondary sources say it lists "sanity test" as a synonym of "smoke test"; the lesson now says "some references treat them as synonyms" without naming ISTQB. Verify by hand. |

Result: 13 existing lessons got a Sources section (8 also got new content), 3 new lessons with 9 self-written exercises. `npm run seed:curriculum -- --dry-run`: 51 lessons, 123 exercises, all valid; `npx vitest run src/curriculum`: 17 tests pass. Imported by the user with `--update`; a read-only check the same day found all 16 lessons of both courses matching the files (English text, current manual Vietnamese, exercises with Vietnamese texts, minutes, order, published status).

# Batch 3: courses 5 and 6

Date: 2026-10-06. Scope: `test-documentation` and `defect-management`.

| Source | How | Result |
|---|---|---|
| ISTQB CTFL syllabus v4.0.1 | Same local copy | Chapter 5 read in full (5.1 planning, 5.2 risk, 5.3 monitoring and reports, 5.4 configuration management, 5.5 defect management). |
| Atlassian: statuses, priorities and resolutions | Web fetch | Default statuses, priorities (Highest to Lowest) and resolutions (Done, Won't do, Duplicate); confirms that issues are now called work items. |
| Atlassian: advanced search (JQL) | Web fetch | Query structure (field, operator, value or function, AND / OR, ORDER BY) and example queries (not copied; the lesson's queries are self-written). |
| Atlassian: work types | Web search only | Title and the Bug work type description seen in search results; page not opened directly. |

Result: 10 existing lessons got a Sources section (6 also got new content), 3 new lessons with 9 self-written exercises. `npm run seed:curriculum -- --dry-run`: 54 lessons, 132 exercises, all valid; `npx vitest run src/curriculum`: 17 tests pass. Not imported into the database yet.

Test pyramid and testing quadrants (CTFL 5.1.6, 5.1.7) are left for the `test-automation` course, which already has a pyramid lesson.
