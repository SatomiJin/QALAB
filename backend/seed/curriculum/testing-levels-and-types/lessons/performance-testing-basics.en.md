A feature that works for one tester can fail when a thousand customers use it at the same moment. **Performance testing** checks how fast and how stable the system is under a given workload. It needs tools (JMeter, k6, Gatling, Locust) and a realistic environment, but every tester should understand the vocabulary, read the results and know which questions to ask.

## The main types

| Type | Question | How | Example |
|---|---|---|---|
| **Load testing** | Does it meet its targets at the expected load? | Ramp up to the normal and peak number of users, hold it | 2 000 users browsing and 200 checking out per minute |
| **Stress testing** | Where does it break, and how? | Increase the load beyond the expected maximum until it fails | Keep adding users until errors appear; does it recover afterwards? |
| **Spike testing** | Can it survive a sudden jump? | Go from low to very high load in seconds | A flash sale starts at 12:00 and traffic goes 10x in one minute |
| **Endurance (soak) testing** | Does it stay stable over time? | Hold a normal load for hours or days | 8 hours at normal load; does memory keep growing? |

Other related types: **scalability testing** (does adding servers increase capacity?) and **volume testing** (large amounts of data, such as a table with 50 million orders).

Stress testing is not only about the breaking point. What matters is **how** the system fails: a clear "please try again" page and a full recovery are acceptable; lost orders or corrupted data are not.

## Key measurements

* **Response time:** how long a request takes, from sending it to receiving the full answer. Measured per transaction (log in, search, pay).
* **Throughput:** how much work the system completes per unit of time, for example **requests per second** or orders per minute.
* **Error rate:** the percentage of requests that fail (timeouts, 5xx status codes).
* **Concurrent users:** how many users are active at the same time.
* **Resource use:** CPU, memory, database connections, disk. Helps find the **bottleneck**, the part that limits the whole system.

When load goes up, throughput usually rises until a point, then flattens while response times climb sharply. That knee in the curve is close to the system's real capacity.

## Why averages lie: percentiles

Imagine 100 search requests: 95 take 200 ms and 5 take 8 seconds. The **average** is about 590 ms, which sounds fine. But 1 user in 20 waits 8 seconds.

**Percentiles** describe this better:

* **p50 (median):** half the requests are faster than this.
* **p95:** 95 % of requests are faster than this; 5 % are slower.
* **p99:** 99 % are faster; the slowest 1 % are slower.

A good performance requirement uses percentiles and a load: "At 1 000 concurrent users, the search p95 response time is under 1 second and the error rate is below 1 %". A requirement like "the site must be fast" cannot be tested.

## What a manual tester can do

Even without running load tests yourself, you can:

* ask for **measurable** performance requirements during refinement (which transaction, which load, which percentile, which limit);
* notice and report slow screens during functional testing, with the time measured (the browser's developer tools show request timings in the Network tab);
* check what users see under load: loading indicators, timeouts with a clear message, no double orders when someone clicks **Pay** twice because the page was slow;
* help design realistic scenarios: which user journeys matter and in what proportion (most users browse, few pay);
* compare results between releases: a p95 that grows from 400 ms to 900 ms is a regression, even if it is still "under 1 second".

Performance tests must run on an environment close to production in size and data. Results from a laptop or an empty test database say very little about real users.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 2.2.2 "Test types" (performance efficiency as a non-functional quality characteristic). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors.
* The load, stress, spike and endurance types, the measurements and the percentile advice are common performance-testing practice, explained in the QALAB team's own words. The CTFL syllabus does not cover them in detail.

> Key idea: load, stress, spike and endurance tests ask different questions about the same system. Judge results with percentiles, throughput and error rate, never with the average alone.
