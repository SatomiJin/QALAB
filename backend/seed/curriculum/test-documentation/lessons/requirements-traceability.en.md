Writing good test cases is not enough: you also need to show that **every requirement** is covered by at least one of them, and to know which requirements are affected when something fails or changes. That link between requirements and tests is called **traceability**, and the usual tool for it is a **requirements traceability matrix (RTM)**.

## What traceability gives you

* **Coverage:** you can prove that each requirement has tests, and spot the ones that have none.
* **Impact:** when a requirement changes, you know exactly which test cases to update and rerun.
* **Status per requirement:** the product owner asks "is password reset ready?", not "did TC-047 pass?". The RTM answers in their language.
* **No orphan work:** a test case that maps to no requirement either tests something nobody asked for, or reveals a requirement that was never written down.

## The RTM

An RTM is a table with one row per requirement. A simple one fits in a spreadsheet; test management tools build it from links between stories and test cases.

| Requirement | Description | Test cases | Latest result | Defects |
|---|---|---|---|---|
| REQ-01 | Log in with email and password | TC-01, TC-02 | Pass | — |
| REQ-02 | Show a generic error on wrong credentials | TC-03 | Fail | BUG-112 |
| REQ-03 | Reset the password by email link | TC-04, TC-05 | Not run | — |
| REQ-04 | Lock the account for 15 minutes after 5 failed attempts | — | — | — |
| REQ-05 | "Remember me" keeps the session for 30 days | TC-06 | Blocked | BUG-115 |

Read it row by row. REQ-01 is covered and passing. REQ-02 is covered but failing, with a linked bug. REQ-03 is covered but has no result yet. REQ-04 has **no test case at all**: it is untested. REQ-05 is covered but blocked.

## Forward and backward traceability

| Direction | Question | Finds |
|---|---|---|
| Forward (requirement → test) | Does every requirement have tests? | Untested requirements (REQ-04) |
| Backward (test → requirement) | Does every test belong to a requirement? | Orphan tests, missing or outdated requirements |
| Bidirectional | Both | Full picture, and the impact of a change in either direction |

Many teams also trace one more step: test case → defect. Then a requirement's row shows the open bugs that stop it from being done.

## Measuring coverage

**Requirements coverage** = requirements with at least one test case ÷ all requirements. In the table, 4 of 5 requirements have test cases: 80 %.

Coverage and results are different things. 80 % coverage says nothing about quality: REQ-02 is covered and failing. Report both: how much is covered, and of that, how much passes. Also remember that one test case per requirement is a minimum, not a target. "Lock the account after 5 failed attempts" needs at least the 4th attempt (not locked), the 5th (locked) and the end of the 15 minutes (unlocked again).

## Finding untested requirements

1. List every requirement with a stable ID (user stories, acceptance criteria, specifications).
2. Link each test case to the IDs it verifies, while you write it, not at the end.
3. Filter the RTM for rows with no test cases. Each one is a gap: write the missing cases, or record a decision that it is out of scope.
4. Filter for test cases with no requirement. Ask whether a requirement is missing.
5. When a requirement changes, update its row and mark its test cases for review.

Acceptance criteria often hide several requirements in one sentence. "The user can reset the password, and the link expires after 1 hour" is two rows: reset works, and the link expires.

> Key idea: the RTM links each requirement to its test cases, results and defects. Read forward to find untested requirements, backward to find orphan tests, and report coverage and pass status separately.
