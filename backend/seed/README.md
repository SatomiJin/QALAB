# Curriculum seed

The V1 curriculum as versioned files. `npm run seed:curriculum` (from `backend/`) imports it into the linked Supabase project; after that the content is edited in the Admin CMS like any other. Code: `src/curriculum/` (loader, row mapping, write plan, CLI).

```bash
npm run seed:curriculum -- --dry-run   # validate the files, no network (also: npx vitest run src/curriculum)
npm run seed:curriculum                # insert what does not exist yet; existing rows are kept
npm run seed:curriculum -- --update    # the files win: overwrite existing content too
```

* **Idempotent.** Courses are matched by `slug`; modules, lessons and exercises by an id derived from their keys (UUID v5 of `module:<course-slug>/<key>`, `lesson:<course-slug>/<slug>`, `exercise:<course-slug>/<lesson-slug>/<key>`), or by an explicit `id` (only for content that existed before the importer: the Phase 2–3 sample course). Renaming a slug or key therefore creates new content; archive the old one in the CMS.
* **Never deletes.** Removing something from the files leaves it in the database.
* **CMS edits are safe by default.** Without `--update`, existing rows are not touched. With `--update`, rows are overwritten except where the CMS rules forbid it (another parent, another exercise type, changed option / item / category ids of an attempted exercise): those are skipped with a warning.
* **Translations.** Every text has a Vietnamese version, imported as a `manual` translation — but only while the stored English is the English of the files. If an admin changed the English, the file's Vietnamese is not written (the existing one goes stale as usual).
* Runs with the service role from `backend/.env` (it writes translations, which no API role may). It changes the shared cloud database: say so before running it.

## Layout

```text
seed/curriculum/
└── <course-slug>/
    ├── course.json                     course, modules, lessons (metadata, in order)
    └── lessons/
        ├── <lesson-slug>.en.md         lesson body, English (source of truth)
        ├── <lesson-slug>.vi.md         lesson body, Vietnamese
        └── <lesson-slug>.exercises.json  exercises of the lesson, in order
```

A file in `lessons/` that no lesson in `course.json` names is an error. Order in the arrays is `order_index`. Courses are ordered within their skill by `order`.

### `course.json`

```json
{
  "skill": "test_design",
  "slug": "test-design-techniques",
  "order": 1,
  "title": { "en": "Test design techniques", "vi": "Kỹ thuật thiết kế test" },
  "description": { "en": "…", "vi": "…" },
  "modules": [
    {
      "key": "input-techniques",
      "title": { "en": "…", "vi": "…" },
      "description": { "en": "…", "vi": "…" },
      "lessons": [
        { "slug": "equivalence-partitioning", "title": { "en": "…", "vi": "…" }, "minutes": 8 }
      ]
    }
  ]
}
```

* `skill`: `fundamentals`, `testing_types`, `test_design`, `test_docs`, `defect_mgmt`, `api_testing`, `automation`.
* `slug` (course, lesson) and `key` (module, exercise): `^[a-z0-9]+(-[a-z0-9]+)*$`. Course slugs are unique overall, lesson slugs within the course, exercise keys within the lesson.
* Optional everywhere: `status` (`draft` | `published` | `archived`, default `published`).
* Limits (DB checks): title 160, description 2000, lesson body 100 000, question 2000, explanation 10 000, option/item/category/rubric text 500, model answer 10 000 characters; `minutes` 1–600.

### `<lesson-slug>.exercises.json`

A list. Common fields: `key`, `type`, `difficulty` (`easy` | `medium` | `hard`), `question` (Markdown), `explanation` (Markdown, shown after an attempt: why the answer is right). Per type (the shapes of `src/practice/exercise-schema.ts`, with every text bilingual):

```jsonc
// multiple_choice: 2–8 options; "multiple": true for checkboxes (several correct)
{ "key": "…", "type": "multiple_choice", "difficulty": "easy",
  "question": { "en": "…", "vi": "…" },
  "prompt": { "multiple": false, "options": [ { "id": "a-id", "text": { "en": "…", "vi": "…" } } ] },
  "answer": { "correct": ["a-id"] },
  "explanation": { "en": "…", "vi": "…" } }

// classification: 2–6 categories, 2–20 items, every item mapped
{ "type": "classification",
  "prompt": { "categories": [ { "id": "…", "text": {…} } ], "items": [ { "id": "…", "text": {…} } ] },
  "answer": { "mapping": { "item-id": "category-id" } } }

// test_case
{ "type": "test_case", "prompt": {},
  "answer": {
    "requiredFields": ["testCaseId", "title", "preconditions", "testData", "steps", "expectedResult", "priority", "testType"],
    "expectedConcepts": [ { "concept": "Boundary value", "keywords": ["boundar", "edge", "bien"] } ],
    "modelAnswer": { "en": "…", "vi": "…" },
    "rubric": [ { "id": "…", "text": { "en": "…", "vi": "…" } } ] } }

// bug_report: requiredFields from bugId, title, environment, preconditions, stepsToReproduce,
// actualResult, expectedResult, severity, priority, attachment
{ "type": "bug_report", "prompt": {},
  "answer": { "requiredFields": […], "expectedSeverity": "critical|major|minor|trivial",
              "expectedPriority": "high|medium|low", "expectedConcepts": […], "modelAnswer": {…}, "rubric": […] } }

// scenario (free text): 1–20 concepts
{ "type": "scenario", "prompt": {}, "answer": { "expectedConcepts": […], "modelAnswer": {…}, "rubric": […] } }
```

Ids (options, items, categories, rubric): `^[a-z0-9][a-z0-9_-]{0,39}$`, unique in their list. Once learners have attempted an exercise, its ids are fixed: change texts, not ids.

## Writing content

* **Audience:** a beginner who wants to work as a QA engineer. Practical, concrete examples (a sign-up form, a checkout, an API), no filler. Follow the style of `qa-fundamentals-first-steps`: a short intro paragraph, `##` sections, tables for comparisons, a closing `> Key idea: …` (VI: `> Ý chính: …`). Lesson bodies do not repeat the lesson title as a heading. 400–900 words.
* **Vietnamese:** natural Vietnamese, not word-for-word. Standard QA terms stay in English (test case, bug report, severity, priority, regression, smoke test, boundary value, equivalence partitioning, test plan, API, status code, …); an explanation in brackets the first time is fine. Code, code blocks, URLs, HTTP methods and field names stay exactly as in English. The `.vi.md` keeps the same headings and code blocks (the loader compares their counts).
* **Exercises:** 2–3 per lesson; mix the types (multiple choice and classification for concepts; test case, bug report and scenario for skills). The question must be answerable from the lesson. Wrong options are plausible mistakes, not jokes. Every explanation says why the right answer is right and why the tempting wrong one is wrong.
* **Keywords** (free-text grading is keyword matching at the start of a word, case and accent insensitive): give each concept 2–6 keywords, including word stems (`boundar` finds boundary/boundaries), synonyms and **unaccented Vietnamese** forms (`bien`, `gia tri bien`, `khong hop le`) so answers in Vietnamese are graded too. Avoid keywords so short they match by accident (`id`, `ok`). The loader checks that the English **and** the Vietnamese model answer each match at least 70 % of the concepts.
* **Severity vs priority** are taught and graded separately: severity = impact on the system, priority = urgency of the fix.
