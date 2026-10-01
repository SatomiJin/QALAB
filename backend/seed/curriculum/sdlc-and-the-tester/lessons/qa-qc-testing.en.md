Job titles mix these words freely ("QA engineer", "QC team", "tester"), but in the profession **quality assurance**, **quality control** and **testing** mean different things. Knowing the difference helps you explain your work and see where quality is really won or lost.

## Three scopes

The three terms are nested, from the widest to the narrowest:

* **Quality assurance (QA)** is about the **process**: setting up the way the team works so that defects are *prevented*.
* **Quality control (QC)** is about the **product**: checking what was built so that defects are *detected* before users meet them.
* **Testing** is one of the main QC activities: evaluating the software, by running it or examining it, to find defects and give information about its quality.

```text
Quality management
└── Quality assurance (process, prevention)
    └── Quality control (product, detection)
        └── Testing
```

## Quality assurance: prevention

QA asks: *is the way we work likely to produce good software?* It looks at how requirements are written, how code is reviewed, which standards the team follows and how it learns from mistakes. Typical QA activities:

* Defining a coding standard and a review checklist.
* Agreeing that every story has acceptance criteria before a sprint starts.
* Training the team on a new tool or technique.
* Analysing the root cause of escaped bugs and changing the process in a retrospective.
* Auditing whether the agreed process is actually followed.

QA work rarely finds a specific bug. Its success shows as *fewer* bugs being made in the first place.

## Quality control: detection

QC asks: *does this product, or this piece of it, meet the requirements?* It examines a concrete work product, such as a build, a document or a release candidate. Typical QC activities:

* Running test cases on a build and reporting bugs.
* Reviewing a specific requirements document for missing cases.
* Checking a release against its exit criteria.
* Measuring defects found per feature to decide whether it is ready.

## Comparison

| | Quality assurance | Quality control | Testing |
|---|---|---|---|
| Focus | Process | Product | Product |
| Goal | Prevent defects | Detect defects | Find defects, give information |
| Question | Are we working the right way? | Is this product good enough? | Does it behave as expected? |
| Timing | Throughout the project | When a work product exists | When a work product exists |
| Example | Introduce a review checklist | Check the release against exit criteria | Run the checkout test cases |
| Responsibility | Whole team, led by QA or management | Testers, reviewers | Testers, developers |

## A worked example

A team keeps shipping bugs in date handling (time zones, end of month).

* **Testing / QC:** the tester runs boundary tests on 31 January and 1 February, finds two defects and reports them. Those two bugs are fixed.
* **QA:** in the retrospective the team adds "date and time-zone cases" to the story checklist and a shared date helper to the coding standard. Next sprint, fewer date bugs are written at all.

Both are needed. Detection without prevention means finding the same kind of bug forever; prevention without detection means trusting a process nobody checks.

## Quality is a team responsibility

Even with the title "QA engineer", you do not *own* quality alone, and you cannot test it into a product at the end. Developers prevent defects with reviews and unit tests, the Product Owner with clear stories, and the tester supports all of them, which links directly to shift-left from the previous lesson.

> Key idea: QA improves the process to prevent defects, QC checks the product to detect them, and testing is the main QC activity. A good QA engineer does both: finds bugs in the product and helps change the process so they are not made again.
