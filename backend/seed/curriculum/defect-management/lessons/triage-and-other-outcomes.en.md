Not every bug ends with a fix. Some are not bugs at all, some are already known, some cannot be reproduced, and some are real but will not be fixed now. These outcomes are normal; what matters is that each one is decided on purpose, with a reason written in the report, and that the tester knows what to do next.

## Triage

**Triage** is the regular review of new bugs, usually a short meeting (daily near a release, weekly otherwise) with the test lead, a developer lead and the product owner. For each New bug they decide:

1. Is it valid? Is it a duplicate?
2. Severity: is the tester's rating right?
3. Priority: how urgent is it for the business?
4. Who fixes it, and in which release?

Testers attend to explain their bugs and answer questions. A clear report makes triage take seconds; an unclear one comes back with "need more info".

## The other outcomes

| Outcome | When it applies | What the tester does next |
|---|---|---|
| Rejected (Not a Bug) | The behaviour is correct: it matches the requirement, or the test was wrong (wrong data, wrong environment) | Check the requirement. If you agree, accept it and fix your test. If the requirement itself looks wrong, raise it with the product owner |
| Duplicate | The same failure is already reported | Check that it really is the same failure; add any new information to the original and follow that one |
| Cannot Reproduce | The developer followed the steps and did not see the failure | Retry on the latest build, compare environments, add missing details, logs or a video; reopen with them, or close it if you cannot reproduce it either |
| Won't Fix | It is a real bug, but the cost or risk of fixing it is higher than its impact (old browser, feature being removed) | Make sure the decision and its reason are recorded; mention it as a known issue if users can meet it |
| Deferred | It is a real bug, fixed later: not in this release | Check that it has a target release; retest it when that release is tested |

**Rejected and Cannot Reproduce are not insults.** They are questions back to you: "show me". Answer with facts, not with frustration. **Won't Fix and Deferred are business decisions:** the tester's job is to make sure the impact is understood when the decision is made, not to win the argument.

## Cannot Reproduce: a closer look

It is the most common outcome to push back on, so be systematic:

* **Same build?** The bug may be fixed already, or the developer may run older code.
* **Same environment?** Browser, device, OS, screen size, language, time zone, network.
* **Same data?** A specific account, a product with a discount, an empty basket, a name with an accent.
* **Same timing?** Double clicks, slow network, two tabs open, a session that expired.

Then update the report with what you found, a video and the logs, and send it back. If you cannot reproduce it anymore yourself, say so honestly and close it; keep the evidence in case it comes back.

## Defect metrics

Teams track bugs with a few numbers. They show trends; they are not a score for people.

| Metric | What it shows |
|---|---|
| Open bugs by severity and priority | Is the product ready for release? Any open critical bug usually blocks it |
| Bugs found vs fixed per week | Are we finding bugs faster than we fix them? |
| Reopen rate | How many fixes do not work the first time |
| Rejection rate | How many reports were not bugs: may point to unclear requirements or reports |
| Defect leakage | Bugs found in production that testing missed |
| Average time to fix | How long a bug waits, by priority |

A high rejection rate of your own reports is a signal to read the requirements more closely; a high reopen rate is a signal for developers to test their fixes before handing them over.

> Key idea: every bug ends with a decision, not always a fix. Triage decides validity, severity, priority and owner; the tester answers Rejected and Cannot Reproduce with facts, and makes sure Won't Fix and Deferred are decided with their impact in view.
