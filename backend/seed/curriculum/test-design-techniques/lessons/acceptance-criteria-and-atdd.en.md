The other techniques in this course find defects in something that already exists. **Collaboration-based approaches** try to stop defects being written at all: business, developers and testers agree on concrete examples before the code. This lesson covers how a good user story is written together, the two ways to write acceptance criteria, and how **acceptance test-driven development (ATDD)** turns them into test cases.

## User stories: the 3 C's

A user story describes a feature that is valuable to a user or buyer, usually in this form:

```text
As a <role>, I want <goal>, so that <business value>.
```

A story has three parts, the **3 C's**:

* **Card**: the short description itself (a card, a backlog item).
* **Conversation**: the discussion of how the software will be used, written down or not.
* **Confirmation**: the acceptance criteria that say when the story is done.

Writing the story together (brainstorming, mind maps, example mapping) brings three views to the table: **business** (what is valuable), **development** (what is feasible) and **testing** (how we will know it works).

A good story is **INVEST**: Independent, Negotiable, Valuable, Estimable, Small and **Testable**. If nobody can say how to test a story, it is probably unclear, not really valuable, or the stakeholder needs help with testing.

## Acceptance criteria

**Acceptance criteria** are the conditions the implementation must meet to be accepted. They usually come out of the Conversation, and they are the **test conditions** of the story. They are used to define the scope, reach agreement, describe both positive and negative cases, plan and estimate, and serve as the basis for acceptance testing.

Story: *As a shopper, I want to apply a discount code at checkout, so that I pay less.*

**Scenario-oriented** (Given / When / Then, as in BDD):

```gherkin
Given my basket total is 80 USD
When I apply the valid code SAVE10
Then the total becomes 72 USD
```

**Rule-oriented** (a checklist or a table of inputs and outputs):

* A valid code takes its percentage off the basket total.
* An expired or unknown code shows "This code is not valid" and the total does not change.
* Only one code per order.

Either format works, or a custom one, as long as every criterion is clear and unambiguous.

## ATDD: from criteria to test cases

ATDD is a test-first approach: the tests exist before the story is built.

1. **Specification workshop.** Business, developers and testers go through the story and its acceptance criteria, and resolve gaps and ambiguities. ("What if the code reduces the total below zero?" "Can a member combine a code with the member discount?")
2. **Write the test cases**, as a team or by the tester, from the acceptance criteria. Each test is an **example** of how the software should work, so "examples" and "tests" mean the same thing here. Test techniques (EP, BVA, decision tables…) help choose the values.
3. **Order:** first the **positive** tests (everything goes as expected), then the **negative** tests, then **non-functional** characteristics (for example: the code is applied within one second).

Test cases for the discount story:

| # | Given | When | Then |
|---|---|---|---|
| 1 | Basket 80 USD | Apply valid SAVE10 | Total 72 USD |
| 2 | Basket 80 USD | Apply expired SUMMER24 | Message "This code is not valid", total 80 USD |
| 3 | Basket 80 USD with SAVE10 applied | Apply a second valid code | Message "Only one code per order", total 72 USD |
| 4 | Basket 80 USD | Apply " save10 " with spaces and lower case | (Ask in the workshop: accepted or not?) |

Rules for the tests: write them in language the stakeholders understand (preconditions, inputs, expected outcome); cover **every** characteristic of the story but **do not go beyond** it; and do not let two tests describe the same characteristic. Test 4 is a question, not yet a test: it shows the workshop doing its job.

When the tests are written in a format a tool can run (such as Gherkin), developers automate them while they build the story, and the acceptance tests become **executable requirements**.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 4.5.1 "Collaborative user story writing", 4.5.2 "Acceptance criteria" and 4.5.3 "Acceptance test-driven development (ATDD)". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: a user story is a Card, a Conversation and a Confirmation; its acceptance criteria, scenario-oriented or rule-oriented, are its test conditions. In ATDD the team turns them into examples before coding: positive first, then negative, then non-functional, covering the story and nothing beyond it.
