Most QA teams you join will track bugs in **Jira** (Atlassian). The ideas from this course (fields, lifecycle, triage outcomes) carry over directly; this lesson shows where they live in Jira and how to find bugs with **JQL**. Every company configures Jira differently, so treat the names below as the defaults and check your team's setup.

## Jira vocabulary

Atlassian renamed some things in Jira Cloud; you will meet both names at work.

| Today | Older name | Meaning |
|---|---|---|
| Work item | Issue | One tracked piece of work: a story, a task, a bug |
| Work type | Issue type | The kind of work item; **Bug** is one of them |
| Space | Project | The container for a team's work items, with a key such as `SHOP` (so bugs are `SHOP-142`) |
| Workflow | Workflow | The statuses a work item moves through and the allowed transitions |

## From bug report to Jira fields

| Bug report field (this course) | Where it goes in Jira |
|---|---|
| Bug ID | Generated key, such as `SHOP-142` |
| Title | **Summary** |
| Environment, preconditions, steps, actual and expected result | **Description** (many teams use a template), sometimes a separate **Environment** field |
| Priority | **Priority**: by default Highest, High, Medium, Low, Lowest |
| Severity | Not built in: teams add a custom field or use labels |
| Attachment | **Attachments**: screenshots, videos, logs |
| Who fixes it | **Assignee**; you are the **Reporter** |
| Related items | **Linked work items** (for example *duplicates*, *blocks*, *relates to*) and the story the bug belongs to |

Labels and components help to group bugs (`regression`, `checkout`). If your space uses versions, the version where the bug was found and the version that fixes it are recorded too.

## Workflow and resolution

A new space usually starts with a simple workflow: **To Do → In Progress → Done**. Teams add statuses to match their bug lifecycle, such as *In Review*, *Ready for QA* or *Reopened*. Every status belongs to one of three **status categories** (To Do, In Progress, Done), which boards and reports use.

The **resolution** field says *how* a work item ended. The defaults are **Done**, **Won't do** and **Duplicate**; many teams add *Cannot reproduce* or *Not a bug*. So the triage outcomes from the previous lesson usually become resolutions, not statuses:

| Triage outcome | Typical Jira result |
|---|---|
| Fixed and verified | Status Done, resolution Done |
| Duplicate | Resolution Duplicate, linked to the original |
| Won't Fix | Resolution Won't do, with the reason in a comment |
| Deferred | Stays open, moved to a later version or sprint |

## Finding bugs with JQL

The basic search has dropdowns; **advanced search** uses the **Jira Query Language (JQL)**. A query is made of clauses (**field**, **operator**, **value** or **function**), joined with **AND** / **OR**, and sorted with **ORDER BY**:

```sql
issuetype = Bug AND resolution = Unresolved ORDER BY priority DESC, created ASC
```

Queries a tester uses every day:

```sql
issuetype = Bug AND reporter = currentUser() AND statusCategory != Done
project = SHOP AND issuetype = Bug AND labels = regression AND created >= -7d
project = SHOP AND issuetype = Bug AND priority in (Highest, High) AND resolution = Unresolved
```

The first lists your own bugs that are still open; the second, regression bugs from the last week; the third, the open high-priority bugs, which is often the first thing checked against the exit criteria. Save useful queries as **filters** and put them on a dashboard for the team.

## Good habits in Jira

* Search before you create: a JQL query on the summary words often finds a duplicate.
* One bug per work item, linked to the story or test it came from.
* Change the status yourself when it is your turn (retest, reopen) and add a comment with the build you used.
* Do not paste secrets, real customer data or passwords into a work item: many people can read it.

## Sources

* Atlassian Support, [What are work item statuses, priorities, and resolutions?](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-statuses-priorities-and-resolutions/), [What are work types?](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/) and [What is advanced search in Jira Cloud?](https://support.atlassian.com/jira-software-cloud/docs/what-is-advanced-search-in-jira-cloud/), checked 6 October 2026. © Atlassian; summarised in our own words, not copied. Jira names and defaults change; check your own instance.
* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 5.5 "Defect management" (defect management tools fill in some fields automatically). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors.

> Key idea: in Jira a bug is a work item of type Bug in a space; the report goes into Summary, Description, Priority and attachments, severity usually needs a custom field, the workflow holds the lifecycle and the resolution records the outcome. JQL (field, operator, value, AND/OR, ORDER BY) finds the bugs you need.
