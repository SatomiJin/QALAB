You now know seven techniques. Real features need a mix of them, plus a decision on how far to go. This lesson covers the last pair of ideas you need: **positive and negative tests**, and how to **choose and combine techniques** based on risk.

## Positive and negative testing

| | Positive testing | Negative testing |
|---|---|---|
| Question | Does it work when used correctly? | Does it fail safely when used wrongly? |
| Input | Valid data, expected actions | Invalid data, unexpected actions |
| Example | Log in with the right email and password | Log in with a wrong password, or an empty email |
| Expected result | The goal is reached | A clear error, nothing saved or charged, no crash |

Both are needed. Positive tests prove the feature delivers value; negative tests prove it protects itself and the user. Beginners often write only positive tests, and real users quickly find the rest: typos, double clicks, expired cards.

The techniques give you both kinds naturally: invalid partitions and values just outside a boundary are negative tests, exception flows and invalid transitions too.

## Which technique for which problem

| What the requirement looks like | Technique |
|---|---|
| A field with ranges or groups of values | Equivalence partitioning + boundary value analysis |
| Several conditions combined into different outcomes | Decision table |
| A status, counter or timer that changes behaviour | State transition testing |
| A user goal with steps and things that can go wrong | Use case testing |
| Thin requirements, a new feature, or known weak spots | Error guessing + exploratory testing |

Most features combine several rows. A checkout has a quantity field (EP, BVA), discount rules (decision table), order statuses (state transition), a payment journey (use case), and a history of double-charge defects (error guessing).

## Let risk decide the depth

You cannot test everything, so spend effort where failure would hurt most. For each area, ask two questions:

* **Impact**: how bad is a failure? Money, data, security, legal, many users?
* **Likelihood**: how likely is a defect? New code, complex logic, a history of bugs, a rushed change?

| Risk | Depth |
|---|---|
| High (payments, login, personal data) | Several techniques, 3-value BVA, full decision tables, invalid transitions, an exploratory session |
| Medium | EP + 2-value BVA, collapsed tables, main and exception flows |
| Low (a tooltip text) | A quick positive check, maybe part of an exploratory pass |

## Coverage: knowing when you are done

Each technique comes with its own measurable coverage, which turns "I tested it" into a fact you can report:

* **Partition coverage**: every partition has a test.
* **Boundary coverage**: every boundary value (2- or 3-value) has a test.
* **Decision table coverage**: every rule has a test.
* **Transition coverage**: every valid transition is exercised at least once, plus the invalid ones you chose.
* **Use case coverage**: the main flow and every alternative and exception flow.

100 % coverage of a technique does not mean the feature is defect-free; it means that model of the feature is fully tested. Combining techniques covers the gaps of each one.

## Putting it together

For a new "Number of guests: 1 to 8" field on a booking form:

1. EP: valid 4; invalid 0, 9, "two".
2. BVA (2-value): 0, 1, 8, 9.
3. Positive: book for 1, 4 and 8 guests. Negative: 0, 9 and "two" are rejected with a message.
4. Error guessing: leading spaces " 4", the value -1, pasting "4 guests".

About ten tests, chosen for reasons you can explain. That is what test design means.

> Key idea: test both that the feature works and that it fails safely, pick the technique that fits the shape of the requirement, and let risk decide how deep to go.
