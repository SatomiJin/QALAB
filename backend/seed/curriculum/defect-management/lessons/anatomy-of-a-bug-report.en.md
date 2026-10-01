A bug report is a message to someone who was not there when you saw the problem. It must let a developer reproduce the failure, understand its impact and decide what to do, without asking you a single question. Every team uses roughly the same fields; this app uses the ten below.

## The fields

| Field | What it holds | Example |
|---|---|---|
| Bug ID | A unique reference, usually given by the tracker | BUG-1042 |
| Title | What is wrong, where, and under which condition | Checkout: Pay button stays disabled after a valid card is entered |
| Environment | Where you saw it: build, environment, browser or device, OS | staging, build 2.14.0, Chrome 128, Windows 11 |
| Preconditions | What must be true before step 1 | Logged in as a customer with one item in the basket |
| Steps to Reproduce | Numbered actions, one per step | 1. Open checkout. 2. Enter card 4242 4242 4242 4242… |
| Actual Result | What the system did | The Pay button stays grey, no error is shown |
| Expected Result | What it should have done, and the source | The Pay button becomes active (spec CHK-7) |
| Severity | Impact on the system | major |
| Priority | Urgency of the fix | high |
| Attachment | Evidence: screenshot, video, log, HAR file | pay-disabled.mp4, console.log |

Severity and priority are two separate fields on purpose. The next lesson covers them in detail.

## A good title

The title is what people read in a list of 300 bugs, in a triage meeting or in a notification. A useful formula:

**[Area]: [what is wrong] [when / under which condition]**

| Weak title | Better title |
|---|---|
| Login broken | Login: "Invalid password" shown for a correct password containing `&` |
| Bug in cart | Cart: quantity resets to 1 after the page is refreshed |
| App crashes!!! | Android app crashes when a profile photo larger than 10 MB is uploaded |

A good title names the place, the symptom and the trigger. It does not contain opinions ("terrible", "again"), and it does not try to guess the cause in the code.

## Minimal steps to reproduce

Steps are the heart of the report. Write them so that anyone can follow them from a clean start:

1. Start from the preconditions, not from "I was testing for a while".
2. One action per step, with the exact data you used (`test+1@example.com`, quantity `0`).
3. Remove every step that is not needed. If the bug still appears without step 4, step 4 goes.
4. Stop at the step where the problem appears; the result belongs in **Actual Result**.

Minimal steps save the developer time and often point to the cause: if the bug only appears when the email contains a `+`, the steps show it.

## Actual vs expected

**Actual result** is a fact you observed: the message, the number, the status code. **Expected result** is what should happen, and ideally where that rule comes from (the requirement, the design, a previous version). "It does not work" is neither. "The total shows 18.00 USD; it should be 17.00 USD (15 % off 20.00)" is both.

## Evidence

Attach what proves the failure and helps to find the defect:

* a **screenshot** with the problem marked, for visual bugs;
* a short **video** when the steps or timing matter;
* **logs**: browser console, server log lines, the request and response of an API call (HAR file);
* the **test data** you used, if it is not obvious.

Never attach passwords, tokens or real customer data. Mask them first.

> Key idea: a bug report is complete when a stranger can reproduce the failure from it and understand why it matters, without talking to you.
