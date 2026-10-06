You will never have time to test everything (exhaustive testing is impossible), so every test plan quietly answers a question: *where could failure hurt most?* **Risk-based testing** answers it openly. Test activities are chosen, prioritised and managed according to an analysis of risk, so the effort goes where it reduces the most risk.

## What a risk is

A **risk** is a possible event or situation that would cause harm if it happened. It has two attributes:

* **Likelihood**: how probable it is (more than 0, less than 1).
* **Impact**: how bad the consequences would be.

Together they give the **risk level**. The higher the level, the sooner and more thoroughly it is treated.

## Project risks and product risks

| | Project risks | Product risks |
|---|---|---|
| About | Managing and running the project | The quality of the product |
| Examples | The test environment arrives late; estimates were too optimistic; the only tester who knows payments is on leave; a supplier delivers late; scope keeps growing | Wrong discount calculation; a crash on checkout; slow search; a security hole in login; a confusing sign-up flow |
| If it happens | Schedule, budget or scope suffer | Unhappy users, lost revenue and reputation, support costs, legal penalties, in extreme cases physical harm |
| Handled by | Project management (with testers raising them) | Testing, among other measures |

Testers watch both, but risk-based testing is mainly about **product risks**.

## Product risk analysis

Start early, ideally while the requirements are written.

1. **Risk identification**: list the risks, together with stakeholders, through brainstorming, workshops, interviews or cause-and-effect diagrams.
2. **Risk assessment**: categorise each risk, rate its likelihood and impact, work out its level, prioritise, and propose how to handle it.

The assessment can be **quantitative** (level = likelihood × impact) or **qualitative**, with a **risk matrix**:

| Likelihood \ Impact | Low | Medium | High |
|---|---|---|---|
| **High** | Medium | High | High |
| **Medium** | Low | Medium | High |
| **Low** | Low | Low | Medium |

Example for a shop release:

| Risk | Likelihood | Impact | Level |
|---|---|---|---|
| Discount applied twice on the total | Medium (new code) | High (money lost on every order) | High |
| Order confirmation e-mail delayed | Medium | Medium | Medium |
| Footer link to the old blog broken | High | Low | Medium |
| Product images slow on 3G | Low | Medium | Low |

## How the analysis shapes testing

The results of product risk analysis decide:

* the **scope** of testing, and which **test levels** and **test types** to use,
* which **test techniques** to apply and what **coverage** to reach (3-value BVA and full decision tables for the discount rules; a quick check for the footer),
* the **effort** to estimate for each task,
* the **priority**: test the highest risks first, to find critical defects as early as possible,
* whether something **besides testing** should reduce the risk (a code review, a feature flag, monitoring).

## Risk control

**Risk control** has two parts: **risk mitigation** (carrying out the planned actions to lower the level) and **risk monitoring** (checking that they work, refining the assessment, and spotting new risks). Not every risk is mitigated by testing; a team may also **accept** a risk, **transfer** it (to a supplier or an insurer), or prepare a **contingency plan**.

When testing is the mitigation, the options are:

* testers with the right experience for the type of risk,
* the right level of **independence** of testing,
* **reviews** and **static analysis**,
* suitable **test techniques** and **coverage levels**,
* **test types** aimed at the affected quality characteristic (for example performance tests for slow search),
* **dynamic testing**, including **regression testing**.

The risk register is a living document: after each test cycle, update the levels with what you learned. A risk whose tests all pass has a lower **residual risk**; a new defect cluster raises it.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 5.2 "Risk management" (5.2.1–5.2.4). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it. The 3×3 risk matrix is a common example, not taken from the syllabus.

> Key idea: risk = likelihood × impact. Project risks threaten the schedule, budget and scope; product risks threaten quality. Product risk analysis decides scope, techniques, coverage, effort and order of testing, and risk control mitigates and monitors the risks, by testing and by other means.
