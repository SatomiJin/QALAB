Most of a product's life happens after its first release. It gets bug fixes, new features, security patches, a new server, a new database, and one day it is switched off. Testing those changes to a system that is already in use is called **maintenance testing**.

## What maintenance testing covers

Maintenance can be **corrective** (fixing defects), **adaptive** (keeping up with a changed environment, such as a new browser or operating system) or done to improve **performance** or **maintainability**. It comes as **planned releases** or as **unplanned hot fixes** for urgent production problems.

Testing a change to a live system always has two parts:

1. **Did the change work?** Test the new or fixed behaviour (and confirm the fixed defect is gone).
2. **Did anything else break?** Run **regression tests** on the parts that were not changed, which is usually most of the system.

## Triggers: why maintenance testing starts

| Trigger | Examples | What to test besides the change itself |
|---|---|---|
| **Modification** | A planned feature release, a corrective change, an emergency hot fix | Regression of the areas the change touches |
| **Upgrade or migration** | Moving to a new cloud platform, a new database version, a new framework; importing data from an old application | The system in the new environment; **data conversion**: every record arrives complete and correct |
| **Retirement** | Switching off an old application that holds years of data | **Data archiving**; if data must be kept for years, also **restore and retrieval** from the archive |

Example of a migration test: customer data moves from the old shop to the new one. Compare record counts, check that names with accents, old addresses and orders with discounts arrive intact, and check that a customer can log in with the old password (or is asked to reset it, as agreed).

## How much to test: impact analysis

The scope of maintenance testing depends on three things:

* the **risk** of the change (a change to payments is riskier than a change to a footer text),
* the **size of the existing system**,
* the **size of the change**.

**Impact analysis** finds out which parts of the system a change can affect. It is done **before** the change is made too: knowing the consequences helps the team decide whether the change is worth making at all. Typical inputs:

* the code, screens, APIs and database tables that change,
* everything that **uses** them (a shared tax function affects every price on the site),
* traceability between requirements and tests (see the testware lesson),
* the history of defects in the area.

Impact analysis is harder when the documentation is out of date or tests are missing, which is common in old systems. Then experience and exploratory testing fill the gaps.

## Hot fixes: testing under pressure

A hot fix goes to production fast, so there is no time for a full regression run. A reasonable minimum:

1. Reproduce the failure on the old version and confirm the fix on the new one.
2. Run the **core regression set** of the critical flows, ideally automated.
3. Run targeted tests for the areas the impact analysis named.
4. After release, monitor production and run the broader regression in the next planned release.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 2.3 "Maintenance testing". © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors. This lesson is the QALAB team's own explanation based on the syllabus, not a copy of it.

> Key idea: maintenance testing checks changes to a system already in use: the change itself plus regression of what did not change. It is triggered by modifications, migrations and retirement, and impact analysis, guided by risk and size, decides how far to go.
