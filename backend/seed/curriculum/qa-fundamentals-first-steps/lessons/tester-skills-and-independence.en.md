Knowing test techniques is only part of the job. A tester also needs the right habits of mind, works inside a team, and has to bring an outside view without becoming an outsider. This lesson covers the skills a tester needs, the **whole team approach** and the **independence of testing**.

## The skills a tester needs

| Skill | Why it matters | Example |
|---|---|---|
| Testing knowledge | Test techniques make tests more effective | Using boundary values instead of random numbers |
| Thoroughness, curiosity, attention to detail | Hard-to-find defects hide in the details | Noticing the total is rounded differently on the receipt |
| Communication, active listening, teamwork | Results are useless if nobody understands or accepts them | Explaining a bug so the developer can reproduce it at once |
| Analytical and critical thinking, creativity | To see what could go wrong that nobody wrote down | "What if two people redeem the same voucher at the same time?" |
| Technical knowledge | Tools make testing faster | Reading an API response, writing a SQL query, using browser DevTools |
| Domain knowledge | To understand users and talk to the business | Knowing how refunds work in e-commerce |

## Delivering bad news well

Testers often bring bad news, and people tend to blame the messenger. A bug report can feel like criticism of the developer's work; **confirmation bias** makes it hard for anyone to accept evidence that contradicts what they believe ("it worked on my machine"). Some people even see testing as destructive.

So the way you report matters as much as what you found:

* Describe the product's behaviour, never the person: "the total ignores the discount", not "you forgot the discount".
* Bring evidence: steps, data, screenshot, log.
* Assume good intent and share the goal: a better product for users.
* Say what works, too.

## The whole team approach

In the **whole team approach** (a practice from Extreme Programming), anyone with the right skills can do any task and **everyone is responsible for quality**. The team works in a shared space, physical or virtual, so communication is quick. For a tester this means:

* helping the Product Owner write acceptance tests,
* agreeing the test strategy and the automation approach with developers,
* sharing testing knowledge so developers test better themselves.

It is not always the right choice: safety-critical systems, for example, may require a high level of **independent** testing.

## Independence of testing

People are bad at finding their own mistakes, because the same assumptions that produced the mistake also hide it. A degree of independence helps, although developers still find many defects in their own code efficiently.

| Who tests | Independence | Example |
|---|---|---|
| The author | None | A developer runs their unit tests |
| A peer from the same team | Some | Another developer reviews the pull request |
| Testers outside the team, same organisation | High | A central QA team runs system tests |
| Testers from outside the organisation | Very high | An external company does a security audit |

Most projects mix levels: developers do component and component integration testing, testers do system and system integration testing, and business representatives do acceptance testing.

| Benefits of independence | Drawbacks |
|---|---|
| Different background and biases find different defects | Isolation from the development team, poor communication |
| Can challenge and disprove the stakeholders' assumptions | An "us and them" relationship |
| | Developers may stop feeling responsible for quality |
| | Testers seen as a bottleneck or blamed for late releases |

The skill is to keep the independent view while staying inside the team.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 1.5 "Essential skills and good practices in testing" (1.5.1–1.5.3). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: a good tester combines testing knowledge with curiosity, critical thinking and constructive communication. In the whole team approach everyone owns quality; independence helps find different defects, but too much of it isolates testers, so most projects mix levels.
