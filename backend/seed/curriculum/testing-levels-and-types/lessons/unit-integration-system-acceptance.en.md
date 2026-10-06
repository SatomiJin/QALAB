Software is tested at several **levels**, from the smallest piece of code to the whole product in the hands of its users. Each level has its own goal, its own people, its own **test basis** (the documents and knowledge the tests are derived from) and its own typical defects. Knowing the levels tells you which bugs you should expect to find, and which ones should have been caught earlier.

## Unit testing

A **unit** (or component) is the smallest testable piece: a function, a class, a React component. Unit tests check it **in isolation**: its neighbours (database, API, other modules) are replaced by fakes or mocks.

* **Who:** usually the developer who wrote the code, often automated and run on every commit.
* **Test basis:** the detailed design, the code itself, the function's contract.
* **Typical defects:** wrong calculations, an off-by-one at a boundary (`age > 18` instead of `age >= 18`), missing `null` checks, wrong logic in a branch.

Example: `calculateShipping(49.99)` returns `5.00` and `calculateShipping(50.00)` returns `0.00`.

## Integration testing

**Integration testing** checks that units or systems **work together**: the interfaces and the data that flows between them.

* **Component integration:** modules of the same application (the checkout service calls the price service).
* **System integration:** your system with external ones (a payment provider, an email service, a partner API).
* **Who:** developers and testers.
* **Test basis:** interface specifications, API contracts, sequence diagrams.
* **Typical defects:** wrong data format (a date sent as `01/02/2026` and read as February 1st instead of January 2nd), missing fields, wrong units (cents vs dollars), timeouts and error responses that are not handled.

## System testing

**System testing** checks the **whole, integrated system** end to end against its requirements, in an environment as close to production as possible (often called staging).

* **Who:** an independent test team or the QA engineers of the product team.
* **Test basis:** requirements, user stories and acceptance criteria, use cases, risk analysis.
* **Typical defects:** a business flow that breaks across screens, wrong behaviour against a requirement, problems that only appear with real configuration, and non-functional issues (slow pages, a confusing flow).

Example: register, verify the email, log in, add two items to the basket, pay with a test card, and receive the order confirmation.

## Acceptance testing

**Acceptance testing** answers a different question: not "does it work?" but "**is it fit for use, and do we accept it?**". Its goal is confidence, not finding many bugs; a lot of bugs at this level means earlier levels were weak.

* **User acceptance testing (UAT):** real users or business representatives check that the system supports their work.
* **Operational acceptance testing:** operations staff check backups, monitoring, installation and recovery.
* **Contractual and regulatory acceptance:** the system meets a contract or a law (for example data protection rules).
* **Alpha testing:** done by users or an internal team **at the developer's site**, before release.
* **Beta testing:** done by real users **in their own environment**, on a pre-release version, who send feedback.

* **Test basis:** business processes, user requirements, contracts, regulations.
* **Typical defects:** the system does what the specification says, but the specification does not match how people really work.

## The five levels in ISTQB terms

The ISTQB syllabus names five test levels, because it splits integration in two:

1. **Component testing** (unit testing).
2. **Component integration testing**: interfaces between components of one system.
3. **System testing**.
4. **System integration testing**: interfaces with other systems and external services, in an environment close to production.
5. **Acceptance testing**.

Levels are told apart by their **test object**, **test objectives**, **test basis**, the **defects and failures** they target, and the **approach and responsibilities**: exactly the rows of the table below. In sequential models the exit criteria of one level are often part of the entry criteria of the next.

## The levels side by side

| Level | Question | Who | Test basis | Typical defect |
|---|---|---|---|---|
| Unit | Does this piece work? | Developer | Code, detailed design | Wrong calculation, boundary error |
| Integration | Do the pieces talk correctly? | Developer, tester | Interfaces, API contracts | Wrong data format, unhandled error response |
| System | Does the whole product meet the requirements? | Test team | Requirements, user stories | Broken end-to-end flow |
| Acceptance | Is it fit for use? | Users, customer, operations | Business processes, contracts | Does not fit the real workflow |

Levels are not always phases one after the other. In agile teams all of them can happen inside one sprint. What stays the same is the idea: find each kind of defect at the cheapest level where it can be found.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 2.2 "Test levels and test types" and 2.2.1 "Test levels". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: each test level has its own goal, people and test basis. A bug found in UAT that a unit test could have caught is a bug found too late.
