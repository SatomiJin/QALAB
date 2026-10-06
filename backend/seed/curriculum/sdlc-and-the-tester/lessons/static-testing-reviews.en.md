**Static testing** finds defects without running the software: people read and discuss a work product, or tools analyse it. **Dynamic testing** runs the software and watches what it does. Static testing can start on day one, before any code exists, which makes it the cheapest place to catch a defect.

## What can be tested statically

Almost anything the team writes can be reviewed:

* Requirements, user stories and acceptance criteria.
* Designs, API specifications, database schemas.
* Source code and configuration.
* Test plans, test cases and test data.
* User guides and help texts.

Static and dynamic testing find different things. A review can spot a missing requirement, a contradiction or an untestable sentence, problems that no test run can show because there is nothing to compare against. Dynamic testing finds failures that only appear when the code runs, such as a slow page or a crash with real data.

## Types of review

Reviews range from informal to very formal.

| Type | Led by | Formality | Main purpose |
|---|---|---|---|
| Informal review | Anyone (e.g. a pair or buddy check) | No process, no records | Quick feedback |
| Walkthrough | The author | Low to medium | Author explains the work, shares understanding, gathers ideas |
| Technical review | A trained moderator or technical lead | Medium | Peers reach consensus on technical quality and alternatives |
| Inspection | A trained moderator | High: defined roles, checklists, entry and exit criteria, metrics | Find as many defects as possible, measure and improve the process |

A pull request review is usually an informal or technical review. Whatever the type, comment on the work, not on the person, and log what was found so it gets fixed.

## Static analysis

**Static analysis** is static testing done by tools. Linters, type checkers and security scanners read the code without running it and report likely defects:

```text
checkout.ts:42  warning  'discount' is assigned but never used
checkout.ts:57  error    Possible null value: 'basket.items' may be undefined
```

Tools are fast and tireless on code rules; people are needed for meaning: whether the code does what the requirement wants.

## Reviewing requirements for testability

The most valuable review for a tester is of the requirements, before development starts. Read each story asking: *could I write a test that clearly passes or fails?* Look for:

* **Ambiguous words**: "fast", "user-friendly", "secure", "about", "etc." Ask for a number or an example.
* **Missing cases**: what happens with empty input, wrong input, no permission, a lost connection?
* **Undefined rules**: limits, formats, rounding, time zones.
* **Contradictions** with other stories or with the current behaviour.
* **Untestable or missing acceptance criteria**.

## Worked example: reviewing a user story

```text
As a user, I want to upload a profile picture
so that others can recognise me.
Acceptance criteria:
- The picture uploads quickly.
- Large files are not allowed.
- The picture is shown everywhere.
```

A tester's review notes:

| # | Text | Problem | Question to the Product Owner |
|---|---|---|---|
| 1 | "uploads quickly" | Ambiguous, not measurable | Within how many seconds, for which file size and network? |
| 2 | "Large files" | Undefined limit | What is the maximum size: 2 MB, 5 MB? Is the limit inclusive? |
| 3 | (missing) | Formats not stated | Which formats: JPG, PNG, GIF, HEIC? What about a renamed .exe? |
| 4 | (missing) | No error behaviour | What message does the user see when the file is too big or the wrong type? |
| 5 | "shown everywhere" | Vague scope | Which screens exactly: profile, comments, header? |
| 6 | (missing) | Replace and remove | Can the user change or delete the picture? |
| 7 | "As a user" | Unclear role | Logged-in users only? Are pictures moderated? |

Seven defects or questions, found in ten minutes, with no code written. Each answer becomes an acceptance criterion and, later, a test case: boundary values for the size limit, invalid formats, the error message.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 3.1 "Static testing basics" and 3.2.4 "Review types". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: static testing finds defects by examining work products instead of running them. Reviews range from informal checks to formal inspections, tools do static analysis of code, and reviewing requirements for ambiguity and missing cases is where a tester prevents the most defects for the least cost.
