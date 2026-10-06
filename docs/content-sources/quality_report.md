# Quality report: batch 1 (courses 1 and 2)

Date: 2026-10-06. Every lesson below has: an intro, worked examples written by the team, exercises with explanations, a Sources section, English and Vietnamese. QALAB lessons have no separate "learning objectives" field, so the objectives are the ISTQB learning objectives (FL-x.y.z) each lesson covers.

**Review status:** written and validated by Claude, **not yet reviewed by a person**. New lessons are `draft`; existing lessons keep their status.

## Coverage of ISTQB CTFL v4.0.1 chapters 1–3

### `qa-fundamentals-first-steps`

| Lesson | Status | Change | ISTQB objectives | Exercises |
|---|---|---|---|---|
| Why we test | published | Updated: test objectives table, testing vs debugging, static vs dynamic | FL-1.1.1, 1.1.2, 1.2.1 | multiple choice, classification (new) |
| Errors, defects and failures | published | Updated: where defects live, environmental causes, root cause analysis | FL-1.2.3 | classification, bug report |
| The seven testing principles | published | Fixed: principle 7 is "absence-of-defects fallacy" in v4 (was "absence-of-errors"); principles 2–5 explained as in v4 | FL-1.3.1 | multiple choice, scenario |
| STLC: the test process | published | Added: the seven ISTQB activity groups and their testware, impact of context | FL-1.4.1, 1.4.2 | test case |
| Testware, traceability and test roles | **draft, new** | New | FL-1.4.3, 1.4.4, 1.4.5 | classification, multiple choice ×2 |
| Tester skills, the whole team and independence | **draft, new** | New | FL-1.5.1, 1.5.2, 1.5.3 | classification, multiple choice, scenario |

### `sdlc-and-the-tester`

| Lesson | Status | Change | ISTQB objectives | Exercises |
|---|---|---|---|---|
| SDLC models | published | Sources added | FL-2.1.1, 2.1.2 | classification, multiple choice ×2 |
| Agile and Scrum for testers | published | Sources added (ISTQB + Scrum Guide) | FL-2.1.1, 2.1.5 (intro), 1.5.2 | classification, multiple choice, test case |
| Test-first, DevOps, shift left and retrospectives | **draft, new** | New | FL-2.1.3, 2.1.4, 2.1.5, 2.1.6 | classification, multiple choice ×2 |
| QA vs QC vs testing | published | Sources added | FL-1.2.2 | classification, multiple choice |
| Static testing and reviews | published | Sources added | FL-3.1.1, 3.1.2, 3.1.3, 3.2.4 | multiple choice, scenario |
| The review process and its roles | **draft, new** | New | FL-3.2.1, 3.2.2, 3.2.3, 3.2.5 (3.2.4 recap) | classification, multiple choice, scenario |

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
- [ ] Checked on screen in QALAB (EN + VI) after import.

## How to import

```bash
cd backend
npm run seed:curriculum -- --dry-run   # already passes
npm run seed:curriculum                # inserts only what is missing: the 4 new draft lessons, their exercises, and the new "testing-or-debugging" exercise
npm run seed:curriculum -- --update    # also overwrites the 8 existing lessons with the updated files (CMS edits lost)
```

Both real commands write to the shared cloud database. New lessons arrive as `draft`; publish them in the Admin CMS after review.
