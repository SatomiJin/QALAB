A good test case is one that someone else can pick up, run without asking you anything, and reach the same verdict. That only works when every field does its job. This lesson goes through the fields this app uses in its test case exercises, then the habits that separate a useful test case from one that is quietly ignored.

## The fields

| Field | What it holds | Example (sign-up form) |
|---|---|---|
| Test Case ID | A unique, stable identifier, often with a feature prefix | TC-SIGNUP-007 |
| Title | One sentence: what is checked and under which condition | Sign-up rejects a password shorter than 8 characters |
| Preconditions | What must be true *before* step 1: state, accounts, settings | User is logged out; no account exists for nina@example.com |
| Test Data | The exact values used | Email nina@example.com, password Short-1 (7 characters) |
| Steps | Numbered actions, one action per step | 1. Open /register. 2. Enter the email. 3. Enter the password. 4. Press **Create account**. |
| Expected Result | What must be observed if the software is right | Error "Password must be at least 8 characters" under the password field; no account is created |
| Priority | How soon this case must be run (High, Medium, Low) | High |
| Test Type | The kind of test | Functional, negative |

Severity belongs to bug reports, not test cases. **Priority** on a test case says how important it is to run: a case on login or payment is high, a case on the colour of a footer link is low. When time is short, the high-priority cases run first.

## One check per case

Each test case verifies **one** behaviour. "Sign-up with a short password, a long password and an invalid email" gives one verdict for three checks: if it fails, which part failed? And if the short-password check passes but the email check fails, the case is Fail and the passing behaviour is invisible. Split it into three cases. One case may still have several **observations** of the same behaviour (the error message appears *and* no account is created).

## Observable expected results

The expected result must be something you can see, measure or query, so the verdict is not an opinion.

| Not observable | Observable |
|---|---|
| The system works correctly | The dashboard opens and shows "Welcome, Nina" |
| The validation is handled properly | Error "Password must be at least 8 characters" appears under the password field |
| The order is saved | Order #1042 appears in **My orders** with status *Paid* |
| The API responds | Status code 400; body has `details[0].field` = `password` |

Write the expected result from the **requirement**, never from what the software currently does. If you copy today's behaviour, a bug becomes the expected result.

## Preconditions vs steps vs test data

* **Preconditions** describe a *state*, not actions: "user is logged in", "basket contains one item". Setting it up is not part of what you are checking.
* **Steps** are the actions under test. Each step is one action a person can do: open, enter, press, select.
* **Test data** lists concrete values. "A valid email" is not test data; `nina@example.com` is. For boundary checks give the exact value and its size ("7 characters").

## Common mistakes

* A vague title ("Test sign-up") that does not say which condition is checked.
* Several checks in one case, so a failure does not tell you what broke.
* An expected result that is missing, or only on the last step when an earlier step matters.
* Steps that hide decisions ("enter invalid data"): which invalid data?
* Preconditions buried in the steps ("1. Create an account. 2. Log out. 3. …").
* Hidden dependencies on another test case's leftovers; each case sets up its own state.
* Copy-pasted cases where only the title changed.

## A complete example

| Field | Value |
|---|---|
| Test Case ID | TC-LOGIN-012 |
| Title | Login accepts an email with upper-case letters and surrounding spaces |
| Preconditions | Verified account exists for nina@example.com; user is logged out |
| Test Data | Email "  Nina@Example.COM  ", password Correct-Pass-1 |
| Steps | 1. Open the login page. 2. Enter the email. 3. Enter the password. 4. Press **Log in**. |
| Expected Result | The dashboard opens for nina@example.com |
| Priority | Medium |
| Test Type | Functional |

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 1.4.1 "Test activities and tasks" and 1.4.3 "Testware". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors.
* The test case fields used here are a common industry template (the syllabus does not prescribe one; ISO/IEC/IEEE 29119-3 has templates, not used). The explanations and examples are the QALAB team's own.

> Key idea: a good test case checks one behaviour, starts from stated preconditions, uses concrete test data, has one action per step, and ends with an expected result anyone can observe. If another tester could reach a different verdict, the case is not finished.
