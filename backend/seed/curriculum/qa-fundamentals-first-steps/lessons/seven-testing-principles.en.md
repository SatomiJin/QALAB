These seven principles (as listed in the ISTQB Foundation Level syllabus v4.0.1) explain the limits of testing and where to spend your effort.

1. **Testing shows the presence, not the absence, of defects.** Passing tests lower the probability that defects remain; they do not prove the product is bug-free.
2. **Exhaustive testing is impossible.** A form with three fields of 100 values each already has a million combinations. Focus with test techniques, test case prioritisation and risk-based testing.
3. **Early testing saves time and money.** A defect removed from a requirement never reaches the design, code and tests built on it. Start static testing (reviews) and dynamic testing as early as you can.
4. **Defects cluster together.** A few components usually hold most of the defects, or cause most failures in production (the Pareto principle). When you find bugs in one area, look harder there; known clusters feed risk-based testing.
5. **Tests wear out.** Repeating the same tests finds fewer and fewer new defects (older books call this the *pesticide paradox*). Change test data, add new tests. Repetition still has value in automated regression testing, where the goal is to catch what breaks, not to find new bugs.
6. **Testing is context dependent.** There is no single right way to test. A banking app and a game are not tested the same way.
7. **Absence-of-defects fallacy.** Testing every requirement and fixing every defect can still produce a system that users do not want or that loses to competitors. Verification is not enough; validation is needed too.

## Using them at work

When someone asks "is it fully tested?", principles 1 and 2 give the honest answer: *"These are the risks we covered, these are the ones we did not, and here is what we found."*

Principle 3 is your reason to ask for user stories early. Principles 4 and 5 tell you to update where you look and what you run. Principle 7 reminds you to check the product with real use in mind, not only against the specification.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 1.3 "Testing principles". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. The principle names follow the syllabus; the explanations and examples are the QALAB team's own.
