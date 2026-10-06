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

## Checklist-based testing

**Checklist-based testing** is a third experience-based technique: the tester designs and runs tests to cover the items of a checklist. Checklists come from experience, from knowing what matters to users, and from understanding why software fails (the fault-attack list above is one).

Good checklist items:

* are phrased as **questions** that can be checked one by one: "Does every required field show an error when left empty?";
* are not things a tool checks automatically, not entry or exit criteria, and not too general ("Is it user-friendly?");
* are **kept up to date**: items stop finding defects once developers learn to avoid them, and new high-severity defects add new items. Keep the list short enough to be used.

Without detailed test cases, a checklist gives guidance and some consistency. A high-level checklist leads to more variation between testers: potentially more coverage, but less repeatability.

## How they work together

Error guessing gives you the attacks; exploratory sessions give you the time and structure to use them, and to follow surprises. Both **complement** scripted tests, they do not replace them: scripted tests prove the requirement is met and are repeatable for regression; exploratory sessions find what the script did not imagine.

| | Scripted testing | Exploratory testing |
|---|---|---|
| Tests designed | Before execution | During execution |
| Strength | Repeatable, measurable coverage | Finds unexpected defects quickly |
| Weakness | Only finds what was foreseen | Depends on the tester's skill; harder to repeat |
| Evidence | Pass/fail per test case | Charter, session notes, defects, debrief |

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 4.4.1 "Error guessing", 4.4.2 "Exploratory testing" and 4.4.3 "Checklist-based testing". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.
* The session-based test management structure and the charter template ("Explore… with… to discover…") are common practice in the exploratory testing community; the syllabus describes sessions, charters and debriefs in general terms.

> Key idea: use a growing checklist of fault attacks, and explore in time-boxed sessions with a clear charter, notes and a debrief.
