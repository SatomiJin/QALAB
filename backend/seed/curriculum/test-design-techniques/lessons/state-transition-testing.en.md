Some systems do not answer the same way to the same input: it depends on what happened before. A correct password logs you in, unless you already failed three times. **State transition testing** models that memory as states and events, then tests every allowed move and the moves that must be refused.

## States, events and transitions

| Term | Meaning | Login example |
|---|---|---|
| **State** | A situation the system is in, which changes how it reacts | Locked |
| **Event** | Something that happens: user action, time, message | Wrong password entered |
| **Transition** | A move from one state to another, caused by an event | 2 failed → Locked |
| **Action** | What the system does during the transition | Show "Account locked" |

A transition can also stay in the same state: in Locked, a wrong password keeps the account Locked.

## Worked example: lock after 3 failed logins

Requirement: *"After 3 wrong passwords in a row the account is locked. A correct password before that logs the user in and resets the counter. Only an admin can unlock a locked account."*

States: **Ready** (0 failures), **1 failed**, **2 failed**, **Locked**, **Logged in**.

The happy path is short: Ready → (correct password) → Logged in. The interesting part is the counter:

* Ready → wrong password → 1 failed
* 1 failed → wrong password → 2 failed
* 2 failed → wrong password → Locked
* 1 failed or 2 failed → correct password → Logged in (counter reset)
* Locked → admin unlock → Ready

## The state table

A diagram shows the allowed transitions. A **state table** shows every state against every event, so the gaps become visible:

| State \ Event | Correct password | Wrong password | Admin unlock |
|---|---|---|---|
| Ready | Logged in | 1 failed | — (invalid) |
| 1 failed | Logged in | 2 failed | — (invalid) |
| 2 failed | Logged in | Locked | — (invalid) |
| Locked | Locked, login refused | Locked | Ready |

Each "—" is an **invalid transition**: an event the state must not react to. Here, unlocking an account that is not locked should change nothing. The cell "Locked + correct password" is the most important test of the whole feature: if it logs the user in, the lock is useless.

## Deriving tests

1. **Cover every valid transition at least once** (called 0-switch coverage). The table above has 9 valid transitions, and a few long tests can cover them in sequence: wrong, wrong, wrong (Locked), correct (still Locked), admin unlock (Ready), correct (Logged in)…
2. **Test the invalid transitions**: each "—" cell, to check that nothing happens and nothing breaks.
3. **Check the counter rules** the requirement implies: does a correct password really reset the counter? Test wrong, wrong, correct, log out, wrong, wrong: the account must not be locked yet.
4. For each step, the expected result names the **new state**, not only the message on screen.

## Three coverage criteria

| Criterion | Coverage items | 100 % means |
|---|---|---|
| **All states** | States | Every state is reached at least once |
| **Valid transitions** (0-switch) | Valid transitions | Every valid transition is exercised; the most widely used criterion |
| **All transitions** | Valid and invalid transitions in the state table | Every valid transition exercised and every invalid one attempted |

All states is the weakest: you can visit every state without trying every transition. Full valid transitions coverage guarantees all states; full all transitions coverage guarantees both, and is the minimum for mission- and safety-critical software. Try **one invalid transition per test case**: if a test hits two, the first failure can hide the second (**defect masking**).

In diagrams, transitions are often labelled `event [guard condition] / action`, for example `wrong password [failures = 2] / show "Account locked"`.

## Other places to use it

* **Order status**: Created → Paid → Shipped → Delivered, with Cancelled reachable only from some states.
* **Workflows**: draft, in review, published, archived.
* **Devices and sessions**: a timer that logs out after 15 minutes idle, a payment that times out.

Ask "what states does this have?" whenever a feature has a status field, a counter or a timer. If the team has no diagram, drawing one is already a useful review: missing transitions are missing requirements.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 4.2.4 "State transition testing". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: model the states and events, test every valid transition, and prove that the invalid ones are refused.
