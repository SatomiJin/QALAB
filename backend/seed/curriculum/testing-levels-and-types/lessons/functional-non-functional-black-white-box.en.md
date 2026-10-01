Test levels say **where** you test. Test types say **what** you test and **how** you design the tests. Any type can appear at any level: a unit test can check performance, and a system test can be designed from the code. Three pairs of words come up in every QA conversation.

## Functional vs non-functional

**Functional testing** checks **what** the system does: its features and business rules. Does the right total appear, does the email arrive, is the user blocked after five wrong passwords?

**Non-functional testing** checks **how well** it does it: speed, ease of use, accessibility, security, reliability, compatibility. A checkout that computes the right total but takes 20 seconds is functionally correct and non-functionally broken.

| | Functional | Non-functional |
|---|---|---|
| Question | Does it do the right thing? | Does it do it well enough? |
| Example on a login form | A correct password logs the user in | The login answers within 1 second for 500 users at once |
| Example on a checkout | Discount code `SAVE15` takes 15 % off | The page works with a keyboard only |
| Typical source | User stories, business rules | Quality requirements, standards (WCAG), SLAs |

Non-functional requirements are often missing from user stories. Ask for them ("how fast is fast enough?") rather than guessing.

## Black-box vs white-box

These words describe **how a test is designed**, not who runs it.

* **Black-box testing:** the tests are derived from the **specification and behaviour**, without looking at the code. You know the inputs and the expected outputs. Techniques: equivalence partitioning, boundary value analysis, decision tables, state transitions.
* **White-box testing:** the tests are derived from the **internal structure**: the code, its branches, the architecture. The goal is coverage, for example making every `if` take both its true and false branch.
* **Grey-box testing:** a mix. You test through the UI or the API like a black-box tester, but you use some inside knowledge (the database schema, the logs, the API calls the page makes) to aim better.

Example: the rule is "free shipping from 50 USD". A black-box tester tries 49.99, 50.00 and 50.01. A white-box tester reads `if (total > 50)`, sees that 50.00 takes the wrong branch, and writes a test for it. Both find the same bug from different starting points.

Most manual QA work is black-box or grey-box. White-box design is common in unit tests written by developers.

## Positive vs negative testing

* **Positive testing** (happy path) uses **valid** input and checks that the system does what it should: a valid email and password log the user in.
* **Negative testing** uses **invalid or unexpected** input and checks that the system **handles it gracefully**: a clear error message, no crash, no data saved, no stack trace shown.

Negative ideas for a sign-up form:

* an email without `@`, or with spaces around it
* a password of 7 characters when the minimum is 8
* an empty required field
* a name of 10 000 characters
* the same email registered twice
* pressing **Sign up** twice quickly

A negative test **passes** when the system rejects the bad input correctly. "Negative" describes the input, not the expected verdict.

Beginners tend to write only positive tests because the requirements describe the happy path. Real users mistype, paste, double-click and lose their connection, so a good test set usually has more negative cases than positive ones.

## Putting the words together

One test can be described with all three pairs. "Enter a 7-character password and expect the error *Password must be at least 8 characters*" is a **functional**, **black-box**, **negative** test, run at the **system** level.

> Key idea: functional is *what* the system does, non-functional is *how well*; black-box designs tests from behaviour, white-box from code; negative tests check that bad input is handled, and they pass when it is.
