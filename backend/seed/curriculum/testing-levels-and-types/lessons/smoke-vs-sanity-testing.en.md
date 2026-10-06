Before you spend a day testing a new build, you want to know that it is worth testing at all. Smoke and sanity testing are two quick checks that answer that question in different ways. Teams use the words loosely, so learn the idea behind each one and ask what your team means.

## Smoke testing

The name comes from hardware: switch the device on and see if smoke comes out. In software, a **smoke test** checks that the **most important functions work at all** on a new build, so that deeper testing makes sense.

* **When:** on every new build or deployment, before any other testing. Often automated in the CI pipeline as a **build verification test (BVT)**.
* **Scope:** **wide and shallow**: many areas, one quick check each.
* **Depth:** does the page open, does the main action complete? No edge cases.
* **If it fails:** the build is **rejected** and sent back. Nobody starts detailed testing.

Smoke test for an online shop:

1. The home page loads.
2. A user can log in.
3. Search returns products.
4. A product can be added to the basket.
5. Checkout reaches the payment step.
6. The admin panel opens.

Ten to thirty minutes, not hours.

## Sanity testing

A **sanity test** is a quick, focused check that **a specific change or fix behaves reasonably**, before investing in a full test cycle on it.

* **When:** after a small change, a bug fix or a configuration change, often on a build that is already fairly stable.
* **Scope:** **narrow and deep**: one area, checked more carefully.
* **Depth:** the changed function and its immediate neighbours, with a few variations.
* **If it fails:** the change goes back to the developer; there is no point running the full regression yet.

Sanity test after a fix to the "change delivery address" feature: change the address on an open order, check the new address on the order page and in the confirmation email, try an address with a long street name, and check that a shipped order can no longer be changed.

Sanity testing is usually unscripted or lightly scripted, based on the tester's understanding of the change.

Be aware that some references, including glossaries, treat *sanity test* simply as another name for *smoke test*. The distinction below is the one most teams use day to day; when in doubt, agree on the words with your team.

## Side by side

| | Smoke testing | Sanity testing |
|---|---|---|
| Question | Is this build stable enough to test? | Does this change make sense? |
| Coverage | Wide and shallow | Narrow and deep |
| Trigger | Every new build | A specific change or fix |
| Documented | Usually scripted, often automated | Often unscripted |
| Typical size | The critical paths of the whole product | One feature and its neighbours |
| On failure | Reject the build | Return the change |

Both are **gates**: they decide whether to spend more effort. Neither replaces regression testing. Sanity testing is close to retesting, but it is wider than re-running one failed test: it checks that the changed area as a whole is reasonable.

## On a real release

Release 3.2 of a shop adds Apple Pay and fixes a bug where the basket counter showed the wrong number.

1. **Smoke test** on the new build: home, login, search, basket, checkout, admin. All pass, so the build is accepted.
2. **Sanity test** on the basket fix: add, remove and change quantities, check the counter each time, including on mobile.
3. **Functional testing** of the new Apple Pay feature.
4. **Regression testing** of payment and basket, chosen by impact analysis.
5. After deployment to production, a short **smoke test** again on production.

If step 1 had failed (for example, login returned an error), steps 2 to 5 would not have started.

## Sources

* Smoke and sanity testing are not separate topics in the ISTQB Foundation syllabus; this lesson describes common industry practice in the QALAB team's own words.
* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), sections 2.1.4 "DevOps and testing" (fast feedback in the pipeline) and 2.2.3 "Confirmation testing and regression testing", for the related terms. © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors.

> Key idea: smoke testing is wide and shallow and asks "can we test this build?"; sanity testing is narrow and deep and asks "does this change make sense?". Both are quick gates before the real testing work.
