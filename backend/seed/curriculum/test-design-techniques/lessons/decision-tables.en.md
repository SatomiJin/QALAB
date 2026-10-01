Some requirements are not about one field but about **combinations**: "members get a discount, big orders get free shipping, unless…". Testing them by feel always misses a combination. A **decision table** lists every combination of conditions and the action the system must take for each, so nothing is left out.

## The parts of a decision table

| Part | What it is | Example |
|---|---|---|
| **Conditions** | Inputs or facts that are true or false | Customer is a Premium member |
| **Actions** | What the system does | Give free shipping |
| **Rules** | One column = one combination of conditions and its actions | Member = Yes, Total ≥ 100 = No → 5 % off |

With yes/no conditions, the number of combinations is **2 to the power of the number of conditions**: 2 conditions give 4 rules, 3 give 8, 4 give 16. Every rule becomes at least one test case.

## Worked example: a shop discount

Requirement: *"Orders of 100 USD or more get free shipping. Premium members always get free shipping and 5 % off."*

| | Rule 1 | Rule 2 | Rule 3 | Rule 4 |
|---|---|---|---|---|
| C1: Premium member | Y | Y | N | N |
| C2: Total ≥ 100 USD | Y | N | Y | N |
| A1: Free shipping | X | X | X | - |
| A2: 5 % off | X | X | - | - |

How to build it:

1. **List the conditions** from the requirement (two here).
2. **Write all combinations.** Alternate Y/N in the last row, pairs in the row above, and so on, so no combination repeats or goes missing.
3. **Fill in the actions** for each rule from the requirement. If you cannot decide an action, you have found a gap in the requirement: ask before testing.
4. **Write one test per rule**, for example rule 4: a non-member orders 60 USD → pays shipping, no discount.

Combinations like rule 2 (member, small order) are exactly the ones informal testing forgets.

## Collapsing the table

When two rules have the **same actions** and differ in only **one condition**, that condition does not matter for them. Merge them into one rule and write "-" (don't care) for that condition.

Rules 1 and 2 above both give free shipping and 5 % off, and differ only in C2. Collapsed:

| | Rule 1+2 | Rule 3 | Rule 4 |
|---|---|---|---|
| C1: Premium member | Y | N | N |
| C2: Total ≥ 100 USD | - | Y | N |
| A1: Free shipping | X | X | - |
| A2: 5 % off | X | - | - |

Three tests instead of four. Collapse only when you are sure the condition really makes no difference; in risky areas, test the full table.

## Impossible combinations

Some combinations cannot happen: a user cannot be both "under 18" and "over 65". Mark those rules as impossible and do not invent a test for them. But be careful: "impossible" in the requirement is not always impossible in the system. A form that lets users type both values may still accept the combination; that can be worth one negative test.

## Where decision tables help

* Pricing, discount, tax and shipping rules.
* Eligibility: loans, insurance, access rights.
* Form logic: fields that appear or become required depending on other fields.

They also improve the requirement itself. Filling in the action column often reveals combinations nobody specified, and finding that before coding is the cheapest defect you will ever report.

> Key idea: list every combination of conditions with its expected actions, collapse only the rules where a condition truly does not matter, and test each rule.
