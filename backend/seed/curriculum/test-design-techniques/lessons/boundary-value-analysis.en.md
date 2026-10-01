Defects love edges. A developer who writes `<` instead of `<=` gets every value right except the one on the limit. **Boundary value analysis** (BVA) targets exactly those values: the minimum and maximum of each partition, and their closest neighbours.

## Why boundaries break

Requirements say "from 8 to 20 characters" or "orders of 100 USD or more". Code turns that into comparisons, and comparisons are easy to get slightly wrong:

| Requirement | Correct code | Typical defect | Value that reveals it |
|---|---|---|---|
| Length 8 to 20 | `len >= 8 && len <= 20` | `len > 8` | 8 (rejected by mistake) |
| Length 8 to 20 | `len >= 8 && len <= 20` | `len <= 21` | 21 (accepted by mistake) |
| Free shipping from 100 USD | `total >= 100` | `total > 100` | 100.00 (no free shipping) |

These are **off-by-one** defects. A middle value such as 14 passes with both the right and the wrong code, so EP alone never catches them.

## 2-value BVA

For each boundary, test the value **on** the boundary and its **closest neighbour on the other side**. For a valid range from min to max that gives four values:

* min − 1 (invalid), min (valid), max (valid), max + 1 (invalid).

Example: password length 8 to 20 characters → test **7, 8, 20, 21**.

## 3-value BVA

For each boundary, test the value on it **and both neighbours**. That gives six values:

* min − 1, min, min + 1, max − 1, max, max + 1.

Password example → **7, 8, 9, 19, 20, 21**.

The extra values (9 and 19) catch defects such as a check written as `len == 8` instead of `len >= 8`, which 2-value BVA would miss on that side. Use 3-value BVA where a mistake is expensive: prices, limits, security rules.

## What is "the closest neighbour"?

It depends on the smallest step the field allows:

* Whole numbers: the step is 1 (17 and 18).
* Money with cents: the step is 0.01 (99.99 and 100.00).
* Dates: the step is one day (the last valid day and the day after).
* Text length: one character.

Get the step from the requirement or the UI. Testing 99 instead of 99.99 for a price boundary tests a different partition value, not the edge.

## Worked example: combining EP and BVA

Requirement: *"Quantity must be a whole number from 1 to 10."*

| Technique | Values | Why |
|---|---|---|
| EP | 5 (valid), 0 or less (invalid), 11 or more (invalid), 2.5 (invalid) | One per partition |
| 2-value BVA | 0, 1, 10, 11 | Edges of the valid range |
| Combined set | **0, 1, 5, 10, 11, 2.5** | Six tests cover every partition and every edge |

In practice the BVA values already cover the invalid number partitions (0 and 11 are both boundary values and partition representatives), so the combined set stays small. Keep one middle value too: it shows the "normal" case works and helps you tell an edge defect from a general one.

## Tips

* **Every boundary counts**, not just the numeric limits: the first and last item of a list, an empty field (length 0), the maximum file size, midnight on a date.
* **Open boundaries** ("100 or more") have only one edge to test from the requirement; check whether the system has a hidden technical maximum too (database column, integer size).
* Write the boundary value **and** the expected result in the test case: "8 characters → accepted" is a test; "8 characters" is only data.

> Key idea: test the edges of each partition, on the boundary and just across it, because that is where off-by-one defects live.
