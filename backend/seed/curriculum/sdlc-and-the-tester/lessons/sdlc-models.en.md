The **Software Development Life Cycle (SDLC)** is the path a team follows to turn an idea into working software and keep it running. The STLC from the previous course runs inside it. The SDLC model a team chooses decides *when* you get to test, *what* you test against, and how expensive a late bug will be.

## The phases every model shares

Whatever the model, the same kinds of work happen. Models differ in how they order and repeat them.

| Phase | What happens | What the tester does |
|---|---|---|
| Requirements | Decide what the product must do | Ask questions, check that each requirement is testable |
| Design | Decide how it will be built | Review the design, plan integration and system tests |
| Implementation | Write the code | Prepare test cases and data, support unit testing |
| Testing | Check the built product | Run tests, report bugs, retest fixes |
| Deployment | Release to users | Smoke test in production, check the release |
| Maintenance | Fix and improve after release | Regression testing of every change |

## Waterfall

In **waterfall**, each phase is finished and signed off before the next starts: all requirements, then all design, then all code, then all testing. It suits projects with stable, well-understood requirements and strict documentation needs (some regulated or contract-based work).

The weakness for testers: testing is one late phase. A misunderstood requirement written in month one is discovered in month nine, when fixing it means redoing design and code. When the schedule slips, the testing phase is usually the one that gets squeezed.

## V-model

The **V-model** keeps the sequential order of waterfall but pairs every development phase with a **test level**. Tests for each level are *designed* as soon as the matching development document exists, and *executed* later on the way up the V.

```text
Requirements ............................ Acceptance testing
   System design ...................... System testing
      Architecture design ........... Integration testing
         Detailed design ........... Component (unit) testing
                         Coding
```

| Development phase (left side) | Test level (right side) | What the test level checks |
|---|---|---|
| Business requirements | Acceptance testing | The system meets the users' needs and can be accepted |
| System design / specification | System testing | The whole system behaves as specified, end to end |
| Architecture design | Integration testing | Components and services work together through their interfaces |
| Detailed design | Component (unit) testing | Each function or class works on its own |

Example for an online shop: while the business analyst writes "a customer can pay by card", the tester already writes acceptance tests for paying by card. When architects decide that the order service calls a payment service, the integration tests for that call are planned. This is early testing built into the model.

## Iterative and incremental models

**Iterative** and **incremental** models build the product in small pieces and repeat the cycle many times: plan a little, build a little, test a little, get feedback. Each iteration delivers a working increment, for example "sign-up" first, then "checkout", then "discount codes". Agile methods such as Scrum (next lesson) are the best-known examples.

For testers this means:

* Testing happens in **every iteration**, not once at the end.
* Requirements change, so test cases are kept light and updated often.
* Every new increment can break an old one, so **regression testing** grows with each iteration, and automating it pays off.

## Comparing the models

| | Waterfall | V-model | Iterative / Agile |
|---|---|---|---|
| When testing starts | After coding | Test design starts with requirements | From the first iteration |
| Feedback from users | At the end | At the end | After every iteration |
| Handles changing requirements | Poorly | Poorly | Well |
| Typical documentation | Heavy | Heavy | Light, just enough |
| Main risk for testers | Late, squeezed testing | Rigid when requirements change | Growing regression load |

No model removes the need for testing. What changes is where the tester's effort goes: in waterfall and the V-model into thorough documents and planned test levels, in iterative work into fast feedback and regression.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 2.1 "Testing in the context of a software development lifecycle", 2.1.1 and 2.1.2. © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: the SDLC model decides when testing happens. The V-model mirrors each development phase with a test level, and iterative models test a little in every cycle; in every model, the earlier the tester gets involved, the cheaper the defects are.
