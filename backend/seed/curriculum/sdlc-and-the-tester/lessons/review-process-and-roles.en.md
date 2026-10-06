The previous lesson showed *what* static testing finds. This one shows *how* a review is run so that it actually finds things: why early feedback matters, the activities of a review, who does what, and what makes a review succeed or fail.

## Why early and frequent feedback

When stakeholders see the work only at the end, the product may no longer match what they wanted, or what they want now. The result is expensive rework, missed deadlines and blame. Frequent feedback throughout development:

* catches misunderstandings about requirements while they are cheap to fix,
* makes requirement changes understood and built earlier,
* lets the team focus on the features that bring the most value and reduce the biggest risks.

Reviews are one of the main ways to get that feedback on documents, stories and code.

## The review process

The standard ISO/IEC 20246 describes a generic review process that each team tailors: a formal review uses more of it, an informal one less. A large work product may need several review rounds.

| Activity | What happens | Example: reviewing a "refund" story |
|---|---|---|
| Planning | Define scope: purpose, what is reviewed, which qualities, focus areas, exit criteria, effort and timing | "Check the refund story for testability; done when no open major issue" |
| Review initiation | Make sure everyone has access, knows their role and has what they need | Send the story, the refund policy and a checklist to three reviewers |
| Individual review | Each reviewer examines the work alone, using techniques such as a checklist or scenarios, and logs **anomalies**, recommendations and questions | The tester notes "partial refunds not mentioned" |
| Communication and analysis | Discuss every anomaly (it is not automatically a defect), decide its status, owner and action; judge the quality of the work product | Agreed: partial refunds are a real gap; the Product Owner will add them |
| Fixing and reporting | Create a defect report for each defect, follow up the fixes, accept the work product when exit criteria are met, report the results | The story is updated and accepted; the review result is shared |

## Who does what

| Role | Responsibility |
|---|---|
| Manager | Decides what is reviewed and provides the people and time |
| Author | Creates the work product and fixes it |
| Moderator (facilitator) | Runs the meeting well: mediation, time keeping, a safe place where everyone can speak |
| Scribe (recorder) | Collects the anomalies and records decisions and new findings |
| Reviewer | Reviews the work: a team member, a subject-matter expert or any other stakeholder |
| Review leader | Takes overall responsibility: who takes part, when and where |

One person can hold several roles in a light review. In an **inspection**, the most formal type, the author may not be the review leader or the scribe.

## How formal should it be?

The level of formality depends on the development model, the maturity of the process, how critical and complex the work product is, legal or regulatory needs, and whether an audit trail is required. The same document can get an informal review first and a formal one later. For a reminder of the four review types (informal review, walkthrough, technical review, inspection), see the previous lesson.

## What makes reviews succeed

* Clear objectives and measurable exit criteria. **Evaluating the participants is never an objective.**
* The right review type for the goal, the work product, the people and the context.
* Small chunks: reviewers lose concentration on 40 pages at once.
* Feedback to authors and stakeholders so they can improve.
* Enough time to prepare.
* Management support.
* Reviews as part of the culture, for learning and process improvement.
* Training, so everyone knows their role.
* A facilitated meeting.

A typical failure: a 60-page specification sent the evening before the meeting, with no checklist and the author's manager counting each person's "mistakes". Almost every success factor is missing.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 3.2.1 "Benefits of early and frequent stakeholder feedback", 3.2.2 "Review process activities", 3.2.3 "Roles and responsibilities in reviews", 3.2.4 "Review types" and 3.2.5 "Success factors for reviews". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it. ISO/IEC 20246 is cited as the syllabus cites it; the standard itself was not used.

> Key idea: a review runs through planning, initiation, individual review, communication and analysis, and fixing and reporting. The manager, author, moderator, scribe, reviewers and review leader each have a part, and reviews succeed with clear objectives, small chunks, preparation time and a culture that judges the work, never the people.
