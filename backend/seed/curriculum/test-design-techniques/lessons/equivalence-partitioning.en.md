Most fields accept far more values than you could ever type. **Equivalence partitioning** (EP) lets you test them with a handful of values: you split the possible inputs into groups that the system should treat the same way, then test one value from each group.

## The idea: values that behave the same

A **partition** (or equivalence class) is a set of values for which the software should behave identically. If the system handles one value of the partition correctly, it will very likely handle all the others correctly too. If it fails for one, it will likely fail for all.

So instead of testing every quantity from 1 to 10, you test one, for example 5, and trust it to represent the whole group. That trust is the assumption EP is built on, and it is why the partitions must come from the requirement, not from guesses.

## Valid and invalid partitions

Every input has two kinds of partitions:

* **Valid partitions**: values the system must accept and process.
* **Invalid partitions**: values the system must reject, ideally with a clear message.

Testers often forget the invalid ones, yet that is where many defects live: missing checks, crashes, confusing errors, data saved that should not be.

## Worked example: a quantity field

Requirement: *"On the product page, the quantity must be a whole number from 1 to 10."*

| Partition | Values in it | Valid? | Test value |
|---|---|---|---|
| Below the range | 0, -1, -50… | Invalid | 0 |
| Inside the range | 1 to 10 | Valid | 5 |
| Above the range | 11, 12, 999… | Invalid | 11 |
| Not a whole number | 2.5, "abc", empty | Invalid | 2.5 |

Four partitions, four tests. Each test value stands for its whole group. Notice that "not a whole number" could be split further (decimals, letters, empty field) if the requirement or the risk suggests the system handles them differently, for example if the empty field is checked by different code than letters.

## Rules for choosing partitions

1. **Read the requirement for every condition.** Each range, list or rule gives you at least one valid and one invalid partition.
2. **One value per partition** is the minimum. More values from the same partition rarely find new defects.
3. **Test invalid partitions one at a time.** If a test enters two invalid values at once (quantity 0 *and* an invalid coupon), the first error message can hide the second check. You will not know whether both are handled.
4. **Lists are partitions too.** A "country" dropdown with "EU" and "non-EU" shipping rules has two valid partitions, even if it has 200 countries.
5. **Write down the assumption.** If you are not sure two values behave the same, they may belong to different partitions: ask, or test both.

## Several inputs: Each Choice coverage

A form usually has several fields, each with its own partitions. One test case then covers one partition of **each** field at the same time. The simplest goal is **Each Choice coverage**: every partition of every field appears in at least one test. It does not try every *combination* of partitions; when combinations matter (a rule depends on two fields at once), use a decision table.

Example: quantity (valid 1–10, invalid 0, invalid 11) and delivery country (EU, non-EU). Pairing (0, non-EU) would mix an invalid value with a valid partition that is not tested yet, so keep invalid partitions on their own: (5, EU), (7, non-EU), (0, EU), (11, EU). Four tests: every partition appears, and each invalid value is tested on its own.

## What EP gives you

* **Fewer tests with the same reach.** Ten valid quantities become one test.
* **Visible coverage.** You can say "every partition has a test", which is a measurable goal: partition coverage = partitions tested ÷ partitions identified.
* **A base for boundary values.** EP picks a value from the middle of each group; the next lesson tests its edges.

EP does not tell you about the edges of the partitions, where off-by-one mistakes hide. That is why it is almost always combined with boundary value analysis.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 4.2.1 "Equivalence partitioning". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: split the inputs into groups the system treats the same, valid and invalid, and test one value from each group.
