Three non-functional qualities can be tested by any manual tester with a browser and a bit of method: is the product **easy to use**, can **everyone** use it, and does it **protect** its users and their data? You do not need to be a designer or a security specialist to find serious problems in all three.

## Usability

**Usability** is how easily real users reach their goal: effectively, quickly and without frustration. While testing functions, keep asking:

* Can a first-time user find the main action without help?
* Are labels, buttons and error messages in the user's words, not developer words ("Invalid input" vs "Enter a date like 31/12/2026")?
* Does the system prevent mistakes (disable **Pay** while it processes, confirm before deleting)?
* Is the input kept after an error, or does the user have to type everything again?
* Is it consistent: the same action looks and works the same way on every screen?

Report usability problems like any other defect, with the steps, what confused you and a suggestion. Real usability studies with users go further, but these checks find many issues early.

## Accessibility

**Accessibility (a11y)** means people with disabilities can use the product: people who are blind and use a screen reader, people who cannot use a mouse, people with low vision or colour blindness. The reference standard is **WCAG** (Web Content Accessibility Guidelines); most companies and many laws aim for level **AA**.

Basic checks a tester can do without special tools:

| Check | How | What should happen |
|---|---|---|
| **Keyboard only** | Put the mouse away; use `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc` | Every link, button and field can be reached and used, in a logical order; no keyboard trap |
| **Visible focus** | Press `Tab` through the page | You can always see which element has focus |
| **Labels** | Click a field's label; read the form | Every field has a visible label linked to it, not only a placeholder that disappears |
| **Errors** | Submit the form with mistakes | The error says what is wrong and how to fix it, next to the field, not by colour alone |
| **Contrast** | Use a contrast checker (browser developer tools show it) | Normal text has a contrast ratio of at least **4.5:1** with its background |
| **Images** | Check images that carry meaning | They have a text alternative (`alt`) that describes them |
| **Zoom** | Zoom the browser to 200 % | Content still fits and works, nothing overlaps |

Automated tools (such as Lighthouse or axe in the browser) find some issues quickly, but they cannot tell whether the focus order makes sense or an error message is clear. Manual checks are still needed.

## Security basics for testers

Penetration testing is a specialist job, but many security defects can be found by a careful manual tester. Follow the spirit of the **OWASP** Top 10, the best-known list of web application risks, and stay within what you are allowed to test.

**Authentication and sessions**

* Wrong password and unknown email give the **same** message, so attackers cannot find out which accounts exist.
* Repeated failed logins are limited (lockout or delay).
* After logout, the browser's **Back** button does not show private pages, and an old session no longer works.
* Password reset links expire and work only once.

**Access control**

* Change an id in the URL: `/orders/1042` to `/orders/1043`. You must not see another customer's order (a classic defect called IDOR).
* A normal user opening an admin URL directly gets "forbidden" or "not found", not the admin page.

**Input validation**

* Try special characters and very long input in every field: `'`, `"`, `<script>alert(1)</script>`. The text must be stored and shown as plain text, never executed, and never cause a server error.
* Validation must also happen on the server: a value rejected by the form must be rejected by the API too.

**Data exposure**

* Error pages do not show stack traces, SQL or server versions.
* Responses in the Network tab do not contain more data than the screen needs (no password hashes, no other users' emails).
* Sensitive data is never in the URL (tokens, passwords) and pages use **HTTPS**.

## Sources

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), section 2.2.2 "Test types" (usability and security as quality characteristics). © International Software Testing Qualifications Board (ISTQB®) and the syllabus authors.
* [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/), W3C Recommendation, 12 December 2024. © W3C; W3C document licence. Linked and summarised, not copied.
* [OWASP Top 10:2025](https://owasp.org/Top10/2025/), the OWASP Foundation's list of the most critical web application security risks (released November 2025). The checks in this lesson are the team's own examples.

> Key idea: usability, accessibility and security are part of quality, not extras. A keyboard, a contrast checker, the Network tab and a curious mind already find serious defects.
