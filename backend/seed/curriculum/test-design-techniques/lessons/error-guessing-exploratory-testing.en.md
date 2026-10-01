The techniques so far start from the requirement. **Experience-based techniques** start from the tester: what you know about how software usually breaks, and what you learn while using it. They find the defects nobody wrote a requirement for.

## Error guessing

**Error guessing** means predicting likely mistakes from experience, past defects and common failure patterns, then designing tests to expose them. Done well, it is not random: you work from a list.

A **fault attack** is a deliberate attempt to trigger one known kind of failure. Typical attacks:

| Area | Attack |
|---|---|
| Text input | Empty, only spaces, leading/trailing spaces, 5,000 characters, emoji, `<script>`, quotes `'` and `"` |
| Numbers | 0, negative, decimals, very large, letters, a comma instead of a point |
| Actions | Double-click Submit, Back after paying, refresh during a save, two tabs editing the same item |
| Files | Empty file, wrong extension, huge file, a renamed `.exe` as `.jpg` |
| Time | Midnight, end of month, 29 February, another time zone |
| Network | Slow connection, connection lost mid-request |

Keep a **checklist** like this, grow it with every defect your team finds, and run it against each new feature. That turns personal experience into team knowledge.

## Exploratory testing

**Exploratory testing** is learning, test design and test execution **at the same time**. You do not follow a script: each result tells you what to try next. It is ideal when:

* the requirements are thin or still changing,
* time is short and you need fast feedback,
* scripted tests pass but you suspect problems remain,
* a feature is new and nobody knows its weak spots yet.

"Exploratory" does not mean unstructured. Without a goal and notes it becomes clicking around, and nobody can tell what was covered.

## Session-based test management

**Session-based test management** (SBTM) gives exploratory testing a structure:

1. **Charter**: the mission of the session, written before you start.
2. **Time box**: an uninterrupted session, usually 60 to 120 minutes.
3. **Notes**: what you tested, what you found, questions, ideas for later.
4. **Debrief**: a short talk with the lead or team after the session: what was covered, defects, risks, the next charter.

A common charter template:

> Explore **(target)** with **(resources: data, tools, attacks)** to discover **(information: risks, defects)**.

Example: *Explore the checkout coupon field with expired, reused and very long codes to discover how invalid coupons are handled.*

A good charter is focused enough to finish in one session ("the coupon field", not "checkout") and open enough to let you follow what you find.

## How they work together

Error guessing gives you the attacks; exploratory sessions give you the time and structure to use them, and to follow surprises. Both **complement** scripted tests, they do not replace them: scripted tests prove the requirement is met and are repeatable for regression; exploratory sessions find what the script did not imagine.

| | Scripted testing | Exploratory testing |
|---|---|---|
| Tests designed | Before execution | During execution |
| Strength | Repeatable, measurable coverage | Finds unexpected defects quickly |
| Weakness | Only finds what was foreseen | Depends on the tester's skill; harder to repeat |
| Evidence | Pass/fail per test case | Charter, session notes, defects, debrief |

> Key idea: use a growing checklist of fault attacks, and explore in time-boxed sessions with a clear charter, notes and a debrief.
