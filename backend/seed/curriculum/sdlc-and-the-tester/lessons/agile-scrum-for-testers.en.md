Most teams you will join work in an **Agile** way: they deliver small pieces of working software often, talk more than they document, and expect requirements to change. **Scrum** is the most common Agile framework. This lesson covers what a tester needs to know to work inside a Scrum team.

## Scrum in one page

Scrum organises work in **sprints**: fixed time boxes, usually two weeks, each ending with a usable increment of the product.

| Element | What it is | Why the tester cares |
|---|---|---|
| Product Owner | Owns the product backlog and decides priorities | The person to ask what a story really means |
| Developers | Everyone who builds the increment, testers included | Testing is team work, not a separate department |
| Scrum Master | Coaches the team and removes obstacles | Raise blockers such as a broken test environment |
| Product backlog | Ordered list of everything the product might need | Stories to review before they reach a sprint |
| Sprint planning | The team picks stories for the sprint | Estimate testing effort, flag risky stories |
| Daily Scrum | 15-minute daily sync | Share what is tested, what is blocked |
| Sprint review | The increment is shown to stakeholders | Show what was tested, what is known not to work |
| Retrospective | The team improves how it works | Propose process fixes, e.g. "stories need examples" |

In Scrum the official role is "Developers": a tester is a developer who specialises in testing. Nobody throws code over a wall to a QA team at the end.

## User stories

Work is described as **user stories**, short statements of value from the user's point of view:

```text
As a returning customer,
I want to save my card details,
so that I can pay faster next time.
```

A story is not a full specification. It is a promise of a conversation, and the tester is one of the people who should have that conversation, asking "what happens if...?" before anyone writes code.

## Acceptance criteria

**Acceptance criteria** are the conditions a specific story must meet to be accepted by the Product Owner. They turn the story into something testable. A popular format is **Given / When / Then**:

```text
Given I am logged in and have a saved card
When I open the payment page
Then the saved card is selected by default
And only the last 4 digits are shown
```

Good acceptance criteria are concrete and checkable. Each one usually becomes at least one test case, plus negative cases the criteria imply (an expired saved card, a user with no saved card).

## Definition of Done

The **Definition of Done (DoD)** is a checklist the whole team agrees on that applies to **every** story, for example:

* Code reviewed and merged.
* Unit tests written and passing.
* Acceptance criteria tested and passing.
* No open critical or major bugs for the story.
* Regression suite green.

| | Acceptance criteria | Definition of Done |
|---|---|---|
| Scope | One story | Every story |
| Written by | Product Owner with the team | The whole team |
| Answers | Does it do the right thing? | Is it finished to our quality standard? |

A story is done only when it meets **both**.

## The tester through the sprint

* **Backlog refinement:** review stories, ask questions, propose acceptance criteria and examples.
* **Sprint planning:** include testing in estimates; a story that cannot be tested in the sprint is not ready.
* **During the sprint:** test each story as soon as it is ready, not all of them on the last day; pair with developers; automate regression checks.
* **Sprint review and retrospective:** report quality honestly and suggest process improvements.

## Shift-left

**Shift-left** means moving testing activities earlier, to the left on the timeline: reviewing stories in refinement, agreeing on examples before coding, developers writing unit tests, testing small pieces continuously. It applies the principle of early testing you met in the previous course: a question asked in refinement costs minutes, the same bug found after release can cost days.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 1.5.2 "Whole team approach", 2.1.1 and 2.1.5 "Shift left". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.
* [The Scrum Guide](https://scrumguides.org/scrum-guide.html) (November 2020) by Ken Schwaber and Jeff Sutherland, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): the Scrum roles, events and the Definition of Done. Summarised in our own words.

> Key idea: in Scrum the tester is part of the team from the first conversation about a story. Acceptance criteria say what one story must do, the Definition of Done says what every story needs to be finished, and shift-left moves testing as early as possible.
