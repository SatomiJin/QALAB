-- Sample content, applied after migrations by `supabase db push --include-seed`
-- (cloud) or `supabase db reset` (local). Idempotent: fixed ids; existing
-- content rows are left untouched, translations are refreshed. Skills are
-- reference data and live in the
-- 20260930024128_learning migration. Sample exercises (Phase 3) follow the
-- lessons. The full curriculum arrives in Phase 6.

insert into public.courses (id, skill_id, title, slug, description, status, order_index)
select
  '6f1d2a4e-0c1b-4d7e-9a3f-000000000001',
  s.id,
  'QA fundamentals: first steps',
  'qa-fundamentals-first-steps',
  'What software testing is, why it matters, and how a tester works through a release.',
  'published',
  1
from public.skills s
where s.code = 'fundamentals'
on conflict (id) do nothing;

insert into public.modules (id, course_id, title, description, status, order_index) values
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000000101', '6f1d2a4e-0c1b-4d7e-9a3f-000000000001',
   'What testing is', 'The vocabulary every QA engineer uses from day one.', 'published', 1),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000000102', '6f1d2a4e-0c1b-4d7e-9a3f-000000000001',
   'How testing is done', 'Principles and the test process that turn them into a routine.', 'published', 2)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, slug, estimated_minutes, status, order_index, content_md) values
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001001',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000000101',
  'Why we test',
  'why-we-test',
  6,
  'published',
  1,
  $md$
Software testing is the work of **finding out how a product actually behaves** and comparing that with how it should behave, so that the team can decide whether it is ready.

## Testing is about information

A tester does not "make the software good". A tester produces information:

* what works as expected,
* what does not, and how badly,
* what has not been checked yet.

The team (product owner, developers, you) uses that information to decide: ship, fix first, or accept the risk.

## Why it is worth the cost

| Found during | Typical cost to fix |
|---|---|
| Requirements review | Minutes: change a sentence |
| Development | Hours: change code you just wrote |
| Testing | Hours to days: fix, rebuild, retest |
| Production | Days, plus support, data repair and reputation |

The later a problem is found, the more it costs. That is why testing starts **before** code exists: reviewing requirements is testing too.

## Verification and validation

* **Verification**: are we building the product right? (Does it match the specification?)
* **Validation**: are we building the right product? (Does it solve the user's problem?)

A feature can pass verification and still fail validation: it matches the spec, but the spec was wrong.

> Key idea: testing reduces the risk of failure in use. It cannot prove there are no defects.
$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001002',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000000101',
  'Errors, defects and failures',
  'errors-defects-failures',
  7,
  'published',
  2,
  $md$
Three words describe the chain from a human mistake to a visible problem. Bug reports and test reports use them precisely.

## The chain

1. **Error (mistake)**: a person does something wrong. A developer misreads "at least 18" as "more than 18".
2. **Defect (bug, fault)**: the result in a work product. The code says `age > 18` instead of `age >= 18`.
3. **Failure**: the system does something it should not, when the defect is executed. An 18-year-old cannot register.

Not every defect causes a failure: if no one aged exactly 18 ever registers, the failure never shows up. That is why **boundary values** are tested on purpose.

## Root cause

The **root cause** is the earliest reason for the error: unclear requirements, time pressure, missing review. Fixing the defect removes one bug; fixing the root cause prevents the next ones.

## Example

| | Example |
|---|---|
| Error | The requirement "free shipping from $50" was read as "over $50" |
| Defect | `if (total > 50)` in the checkout code |
| Failure | A $50.00 order is charged shipping |
| Root cause | The requirement did not give an example at the boundary |

> In a bug report you describe the **failure** (what you observed). Developers find the **defect**.
$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001003',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000000102',
  'The seven testing principles',
  'seven-testing-principles',
  8,
  'published',
  1,
  $md$
These principles (from the ISTQB Foundation syllabus) explain the limits of testing and where to spend your effort.

1. **Testing shows the presence of defects, not their absence.** Passing tests lower the risk; they do not prove the product is bug-free.
2. **Exhaustive testing is impossible.** A form with three fields of 100 values each already has a million combinations. Choose tests with techniques and risk.
3. **Early testing saves time and money.** Review requirements and designs, not only running software.
4. **Defects cluster together.** A few modules usually hold most of the defects. When you find bugs in one area, look harder there.
5. **Tests wear out (the pesticide paradox).** Running the same tests again finds fewer new defects. Review and extend them.
6. **Testing is context dependent.** A banking app and a game are not tested the same way.
7. **Absence-of-errors is a fallacy.** A system with no known defects can still be useless if it does not meet the users' needs.

## Using them at work

When someone asks "is it fully tested?", principles 1 and 2 give the honest answer: *"These are the risks we covered, these are the ones we did not, and here is what we found."*
$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001004',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000000102',
  'STLC: the test process',
  'stlc-test-process',
  10,
  'published',
  2,
  $md$
The **Software Testing Life Cycle (STLC)** is the sequence of activities a tester goes through for a release. It runs alongside the development life cycle (SDLC), not after it.

## Phases

| Phase | Main question | Output |
|---|---|---|
| Requirement analysis | What must be tested? | Testable requirements, questions |
| Test planning | How, by whom, when? | Test plan: scope, approach, risks, schedule |
| Test design | Which cases, with which data? | Test cases, test data |
| Environment setup | Where do we run them? | Ready test environment |
| Test execution | Does it behave as expected? | Results (Pass, Fail, Blocked), bug reports |
| Test closure | Are we done, what did we learn? | Test summary report |

## Entry and exit criteria

Each phase has **entry criteria** (what must be true to start) and **exit criteria** (what must be true to finish). For example, execution can start when the build is deployed and smoke tests pass; it can end when all high-priority cases are run and no critical bugs are open.

## Verdicts

During execution every test case gets a verdict:

* **Pass**: actual result matches the expected result.
* **Fail**: it does not; a bug report is written.
* **Blocked**: the case cannot be run (for example, a login bug blocks everything after login).
* **Not run**: not executed yet.

This app uses the same verdicts for your own progress.
$md$
)
on conflict (id) do nothing;

-- Vietnamese translations of the sample course (provider `manual`: written
-- by a person, served in preference to machine translation). QA terms stay
-- in English. `source_hash` is computed here from the English row, exactly
-- as the backend computes it (sha-256 of the UTF-8 text, hex), so editing
-- the English text makes the translation stale instead of wrong.
with source (entity_type, entity_id, field, text) as (
  select 'course', id, 'title', title from public.courses
  union all select 'course', id, 'description', description from public.courses
  union all select 'module', id, 'title', title from public.modules
  union all select 'module', id, 'description', description from public.modules
  union all select 'lesson', id, 'title', title from public.lessons
  union all select 'lesson', id, 'content_md', content_md from public.lessons
),
vi (entity_type, entity_id, field, text) as (
  values
  ('course', '6f1d2a4e-0c1b-4d7e-9a3f-000000000001'::uuid, 'title',
   'Nền tảng QA: những bước đầu tiên'),
  ('course', '6f1d2a4e-0c1b-4d7e-9a3f-000000000001'::uuid, 'description',
   'Kiểm thử phần mềm là gì, vì sao nó quan trọng, và tester làm việc thế nào qua một bản release.'),
  ('module', '6f1d2a4e-0c1b-4d7e-9a3f-000000000101'::uuid, 'title', 'Kiểm thử là gì'),
  ('module', '6f1d2a4e-0c1b-4d7e-9a3f-000000000101'::uuid, 'description',
   'Những từ vựng mọi QA engineer dùng ngay từ ngày đầu.'),
  ('module', '6f1d2a4e-0c1b-4d7e-9a3f-000000000102'::uuid, 'title', 'Kiểm thử được thực hiện thế nào'),
  ('module', '6f1d2a4e-0c1b-4d7e-9a3f-000000000102'::uuid, 'description',
   'Các nguyên tắc, và quy trình kiểm thử biến chúng thành thói quen.'),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001001'::uuid, 'title', 'Vì sao cần kiểm thử'),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001002'::uuid, 'title', 'Error, defect và failure'),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001003'::uuid, 'title', 'Bảy nguyên tắc kiểm thử'),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001004'::uuid, 'title', 'STLC: quy trình kiểm thử'),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001001'::uuid, 'content_md', $vi$
Kiểm thử phần mềm là công việc **tìm hiểu sản phẩm thực sự hoạt động ra sao** rồi so sánh với cách nó phải hoạt động, để cả nhóm quyết định được sản phẩm đã sẵn sàng hay chưa.

## Kiểm thử là để có thông tin

Tester không "làm cho phần mềm tốt lên". Tester tạo ra thông tin:

* cái gì chạy đúng như mong đợi,
* cái gì không đúng, và nghiêm trọng đến mức nào,
* cái gì chưa được kiểm tra.

Cả nhóm (product owner, developer và bạn) dùng thông tin đó để quyết định: release, sửa trước, hay chấp nhận rủi ro.

## Vì sao đáng bỏ công

| Phát hiện ở giai đoạn | Chi phí sửa thường gặp |
|---|---|
| Review requirement | Vài phút: sửa một câu |
| Phát triển | Vài giờ: sửa đoạn code vừa viết |
| Kiểm thử | Vài giờ đến vài ngày: sửa, build lại, test lại |
| Production | Vài ngày, cộng thêm hỗ trợ khách hàng, sửa dữ liệu và uy tín |

Phát hiện vấn đề càng muộn thì càng tốn kém. Vì vậy kiểm thử bắt đầu **trước** khi có code: review requirement cũng là kiểm thử.

## Verification và validation

* **Verification**: ta có đang làm sản phẩm đúng cách không? (Nó có khớp với đặc tả không?)
* **Validation**: ta có đang làm đúng sản phẩm không? (Nó có giải quyết được vấn đề của người dùng không?)

Một tính năng có thể qua verification mà vẫn trượt validation: nó khớp đặc tả, nhưng đặc tả lại sai.

> Ý chính: kiểm thử giảm rủi ro hỏng hóc khi sử dụng. Nó không chứng minh được là không còn defect.
$vi$),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001002'::uuid, 'content_md', $vi$
Ba từ mô tả chuỗi đi từ một sai lầm của con người đến một vấn đề nhìn thấy được. Bug report và test report dùng chúng rất chính xác.

## Chuỗi nguyên nhân

1. **Error (mistake — sai lầm)**: một người làm sai điều gì đó. Developer đọc nhầm "ít nhất 18" thành "lớn hơn 18".
2. **Defect (bug, fault — lỗi)**: kết quả nằm trong sản phẩm công việc. Code ghi `age > 18` thay vì `age >= 18`.
3. **Failure (hỏng hóc)**: hệ thống làm điều nó không được làm, khi defect được thực thi. Người đúng 18 tuổi không đăng ký được.

Không phải defect nào cũng gây ra failure: nếu chưa ai đúng 18 tuổi đăng ký, failure sẽ không bao giờ lộ ra. Đó là lý do **boundary value** (giá trị biên) được test một cách có chủ đích.

## Root cause

**Root cause** (nguyên nhân gốc) là lý do sớm nhất dẫn tới error: requirement không rõ, áp lực thời gian, thiếu review. Sửa defect thì hết một bug; sửa root cause thì ngăn được những bug tiếp theo.

## Ví dụ

| | Ví dụ |
|---|---|
| Error | Requirement "miễn phí vận chuyển từ $50" bị hiểu thành "trên $50" |
| Defect | `if (total > 50)` trong code thanh toán |
| Failure | Đơn hàng đúng $50.00 vẫn bị tính phí vận chuyển |
| Root cause | Requirement không đưa ví dụ ở giá trị biên |

> Trong bug report, bạn mô tả **failure** (điều bạn quan sát được). Developer sẽ tìm ra **defect**.
$vi$),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001003'::uuid, 'content_md', $vi$
Các nguyên tắc này (trong syllabus ISTQB Foundation) giải thích giới hạn của kiểm thử và nên dồn công sức vào đâu.

1. **Kiểm thử cho thấy có defect, không chứng minh là không có defect.** Test pass giúp giảm rủi ro; chúng không chứng minh sản phẩm hết bug.
2. **Không thể kiểm thử toàn bộ.** Một form có ba trường, mỗi trường 100 giá trị, đã có một triệu tổ hợp. Hãy chọn test bằng kỹ thuật và theo rủi ro.
3. **Kiểm thử sớm tiết kiệm thời gian và tiền bạc.** Review requirement và thiết kế, không chỉ phần mềm đang chạy.
4. **Defect thường tập trung thành cụm.** Một vài module thường chứa phần lớn defect. Khi tìm thấy bug ở một khu vực, hãy soi kỹ hơn ở đó.
5. **Test bị "nhờn" (nghịch lý thuốc trừ sâu).** Chạy đi chạy lại cùng một bộ test sẽ tìm được ít defect mới hơn. Hãy review và bổ sung chúng.
6. **Kiểm thử phụ thuộc bối cảnh.** Ứng dụng ngân hàng và một trò chơi không được test theo cùng một cách.
7. **"Không có lỗi" là một ngộ nhận.** Một hệ thống không còn defect nào đã biết vẫn có thể vô dụng nếu không đáp ứng nhu cầu người dùng.

## Áp dụng trong công việc

Khi ai đó hỏi "đã test hết chưa?", nguyên tắc 1 và 2 cho câu trả lời trung thực: *"Đây là những rủi ro đã được cover, đây là những rủi ro chưa, và đây là những gì chúng tôi tìm thấy."*
$vi$),
  ('lesson', '6f1d2a4e-0c1b-4d7e-9a3f-000000001004'::uuid, 'content_md', $vi$
**Software Testing Life Cycle (STLC)** là chuỗi hoạt động tester thực hiện cho một bản release. Nó chạy song song với vòng đời phát triển (SDLC), không phải chạy sau.

## Các giai đoạn

| Giai đoạn | Câu hỏi chính | Đầu ra |
|---|---|---|
| Phân tích requirement | Cần test những gì? | Requirement có thể test được, các câu hỏi |
| Lập kế hoạch test | Test thế nào, ai làm, khi nào? | Test plan: phạm vi, cách tiếp cận, rủi ro, lịch |
| Thiết kế test | Những case nào, dữ liệu nào? | Test case, test data |
| Chuẩn bị môi trường | Chạy ở đâu? | Môi trường test sẵn sàng |
| Thực thi test | Nó có hoạt động như mong đợi không? | Kết quả (Pass, Fail, Blocked), bug report |
| Kết thúc test | Đã xong chưa, rút ra được gì? | Test summary report |

## Entry criteria và exit criteria

Mỗi giai đoạn có **entry criteria** (điều kiện phải đúng để bắt đầu) và **exit criteria** (điều kiện phải đúng để kết thúc). Ví dụ: có thể bắt đầu thực thi khi build đã được deploy và smoke test pass; có thể kết thúc khi mọi case ưu tiên cao đã chạy và không còn bug critical nào mở.

## Verdict

Trong lúc thực thi, mỗi test case nhận một verdict:

* **Pass**: kết quả thực tế khớp với kết quả mong đợi.
* **Fail**: không khớp; viết bug report.
* **Blocked**: không chạy được case này (ví dụ, một bug ở màn đăng nhập chặn mọi thứ phía sau).
* **Not run**: chưa được thực thi.

Ứng dụng này dùng chính các verdict đó cho tiến độ học của bạn.
$vi$)
)
insert into public.content_translations
  (entity_type, entity_id, field, language, source_hash, text, provider)
select
  vi.entity_type,
  vi.entity_id,
  vi.field,
  'vi',
  encode(sha256(convert_to(source.text, 'UTF8')), 'hex'),
  vi.text,
  'manual'
from vi
join source using (entity_type, entity_id, field)
on conflict (entity_type, entity_id, field, language, provider)
do update set text = excluded.text, source_hash = excluded.source_hash;

-- Practice (Phase 3): one or two exercises per sample lesson, covering all
-- five types. Answer keys live in `exercise_answers` (never readable by
-- learners). Existing rows are left untouched.

insert into public.exercises (id, lesson_id, type, question, prompt_data, difficulty, status, order_index) values
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002001',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001001',
  'multiple_choice',
  'Which of these activities is testing, even though no code is run?',
  $j${"options": [
    {"id": "review", "text": "Reviewing the requirements for gaps and contradictions"},
    {"id": "coding", "text": "Writing the code for the feature"},
    {"id": "deploy", "text": "Deploying the release to production"},
    {"id": "estimate", "text": "Estimating the sprint"}
  ]}$j$,
  'easy', 'published', 1
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002002',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001002',
  'classification',
  'Classify each situation as an **error**, a **defect** or a **failure**.',
  $j${"categories": [
    {"id": "error", "text": "Error (human mistake)"},
    {"id": "defect", "text": "Defect (flaw in the product)"},
    {"id": "failure", "text": "Failure (wrong behaviour observed)"}
  ], "items": [
    {"id": "misread", "text": "A developer misreads the discount rule in the requirements"},
    {"id": "wrong-rate", "text": "The code applies a 10 % discount where the rule says 15 %"},
    {"id": "charged", "text": "A customer is charged the wrong amount at checkout"},
    {"id": "null-check", "text": "The price function has no check for an empty basket"},
    {"id": "crash", "text": "The checkout page crashes when the basket is empty"}
  ]}$j$,
  'easy', 'published', 1
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002003',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001002',
  'bug_report',
  $q$Write a bug report for what you observed.

While testing checkout on **staging** (Chrome 128, Windows 11), you add one item priced 20.00 USD to the basket and apply the discount code `SAVE15` (15 % off). The order summary shows a total of **18.00 USD**. The specification says the total must be 17.00 USD.$q$,
  '{}',
  'medium', 'published', 2
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002004',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001003',
  'multiple_choice',
  'Which of these are among the seven testing principles? Select all that apply.',
  $j${"multiple": true, "options": [
    {"id": "exhaustive", "text": "Exhaustive testing is impossible"},
    {"id": "clustering", "text": "Defects cluster together"},
    {"id": "no-defects", "text": "Testing proves that there are no defects"},
    {"id": "early", "text": "Early testing saves time and money"},
    {"id": "automate", "text": "Everything should be automated"}
  ]}$j$,
  'easy', 'published', 1
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002005',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001003',
  'scenario',
  $q$Your manager says: *"Run every possible value through the new age field (valid ages are 18 to 65) so we can be sure it has no bugs."*

How do you answer, and what would you test instead?$q$,
  '{}',
  'medium', 'published', 2
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002006',
  '6f1d2a4e-0c1b-4d7e-9a3f-000000001004',
  'test_case',
  'Write a test case for the login form: a registered user signs in with a valid email and password and lands on the dashboard.',
  '{}',
  'easy', 'published', 1
)
on conflict (id) do nothing;

insert into public.exercise_answers (exercise_id, answer_data, explanation) values
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002001',
  '{"correct": ["review"]}',
  $md$Reviewing requirements is **static testing**: you look for problems without running anything. It finds defects at the cheapest possible moment, before any code is written. Coding, deploying and estimating are not testing activities.$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002002',
  '{"mapping": {"misread": "error", "wrong-rate": "defect", "charged": "failure", "null-check": "defect", "crash": "failure"}}',
  $md$The chain is **error → defect → failure**: a person makes a mistake (error), which leaves a flaw in the product (defect), which shows up as wrong behaviour when the code runs (failure). A defect that is never executed causes no failure.$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002003',
  $j${
    "requiredFields": ["title", "environment", "stepsToReproduce", "actualResult", "expectedResult", "severity", "priority"],
    "expectedSeverity": "major",
    "expectedPriority": "high",
    "expectedConcepts": [
      {"concept": "Discount code", "keywords": ["save15", "discount", "coupon", "giam gia"]},
      {"concept": "Actual total", "keywords": ["18"]},
      {"concept": "Expected total", "keywords": ["17"]},
      {"concept": "Staging environment", "keywords": ["staging", "chrome"]}
    ],
    "modelAnswer": "**Title:** Checkout total ignores part of the SAVE15 discount (18.00 instead of 17.00 USD)\n\n**Environment:** staging, Chrome 128, Windows 11\n\n**Steps to reproduce:**\n\n1. Add one item priced 20.00 USD to the basket.\n2. Go to checkout.\n3. Apply the discount code SAVE15.\n\n**Actual result:** the order total is 18.00 USD.\n\n**Expected result:** the order total is 17.00 USD (15 % off 20.00).\n\n**Severity:** major (wrong amount charged, but checkout still works). **Priority:** high (customers pay the wrong price).",
    "rubric": [
      {"id": "title", "text": "My title says what is wrong and where, without opening the report"},
      {"id": "repro", "text": "Someone else could reproduce it from my steps alone"},
      {"id": "results", "text": "I gave the actual and the expected total, with numbers"},
      {"id": "env", "text": "I named the environment and browser"},
      {"id": "sev-pri", "text": "I kept severity (impact) and priority (urgency) apart"}
    ]
  }$j$,
  $md$A good bug report lets someone who was not there reproduce the problem. The numbers matter: "the total is wrong" is not enough, "18.00 instead of 17.00" is. The customer is charged the wrong price, so the impact is **major** (not critical: checkout still works) and fixing it is urgent, so priority is **high**.$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002004',
  '{"correct": ["exhaustive", "clustering", "early"]}',
  $md$Exhaustive testing is impossible, defects cluster together, and early testing saves time and money are three of the seven principles. Testing shows the **presence** of defects, never their absence, and "automate everything" is not a principle at all.$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002005',
  $j${
    "expectedConcepts": [
      {"concept": "Exhaustive testing is impossible", "keywords": ["exhaustive", "impossible", "every possible", "all values", "khong the"]},
      {"concept": "Boundary values", "keywords": ["boundar", "edge", "17", "66", "bien"]},
      {"concept": "Equivalence partitions", "keywords": ["partition", "equivalence", "class", "group", "phan vung", "nhom"]},
      {"concept": "Invalid values", "keywords": ["invalid", "negative", "letters", "empty", "khong hop le"]}
    ],
    "modelAnswer": "Testing every value is impossible (and would still not prove there are no bugs), so I choose the values most likely to find them:\n\n* **Equivalence partitions:** below 18, 18–65, above 65: one value from each is enough, e.g. 10, 40, 80.\n* **Boundary values:** 17, 18, 65 and 66, where off-by-one mistakes hide.\n* **Invalid input:** empty, negative, letters, decimals.\n\nThat is about ten tests instead of millions, and they target the risky places.",
    "rubric": [
      {"id": "impossible", "text": "I explained why testing every value is not possible"},
      {"id": "partitions", "text": "I split the input into valid and invalid groups"},
      {"id": "boundaries", "text": "I tested on and just outside both boundaries (17, 18, 65, 66)"},
      {"id": "invalid", "text": "I included input that is not a number at all"}
    ]
  }$j$,
  $md$This is the principle **exhaustive testing is impossible**: even a simple field has more inputs than you can run. Test design techniques pick a small set of values that find most defects: **equivalence partitioning** (one value per group) and **boundary value analysis** (values on and next to each edge).$md$
),
(
  '6f1d2a4e-0c1b-4d7e-9a3f-000000002006',
  $j${
    "requiredFields": ["testCaseId", "title", "preconditions", "testData", "steps", "expectedResult", "priority"],
    "expectedConcepts": [
      {"concept": "Registered user", "keywords": ["registered", "existing", "account", "da dang ky", "tai khoan"]},
      {"concept": "Valid credentials", "keywords": ["valid", "correct", "hop le"]},
      {"concept": "Email and password", "keywords": ["email", "password", "mat khau"]},
      {"concept": "Dashboard shown", "keywords": ["dashboard"]}
    ],
    "modelAnswer": "| Field | Value |\n|---|---|\n| Test case ID | TC-LOGIN-001 |\n| Title | Registered user logs in with valid email and password |\n| Preconditions | An account exists for learner@example.com and is verified; the user is logged out |\n| Test data | Email learner@example.com, password Correct-Pass-1 |\n| Steps | 1. Open the login page. 2. Enter the email. 3. Enter the password. 4. Press **Log in**. |\n| Expected result | The dashboard opens and shows the user's name |\n| Priority | High |\n| Test type | Functional |",
    "rubric": [
      {"id": "one-thing", "text": "My test case checks one thing only"},
      {"id": "preconditions", "text": "The preconditions say what must be true before step 1"},
      {"id": "data", "text": "I gave concrete test data, not \"a valid email\""},
      {"id": "expected", "text": "The expected result can be checked as pass or fail"}
    ]
  }$j$,
  $md$A test case must be repeatable by someone else: **preconditions** set the starting state, **test data** is concrete, each **step** is one action, and the **expected result** is observable, so the verdict is a clear pass or fail. Login is a core flow, so priority is high.$md$
)
on conflict (exercise_id) do nothing;

-- Vietnamese translations of the sample exercises (manual). Review texts
-- (explanation, model answer, rubric) are readable by a learner only after
-- attempting the exercise (RLS on content_translations).
with source (entity_id, field, text) as (
  select e.id, 'question', e.question from public.exercises e
  union all
  select e.id, 'option.' || (o ->> 'id'), o ->> 'text'
  from public.exercises e,
    jsonb_array_elements(coalesce(e.prompt_data -> 'options', '[]')) o
  union all
  select e.id, 'category.' || (c ->> 'id'), c ->> 'text'
  from public.exercises e,
    jsonb_array_elements(coalesce(e.prompt_data -> 'categories', '[]')) c
  union all
  select e.id, 'item.' || (i ->> 'id'), i ->> 'text'
  from public.exercises e,
    jsonb_array_elements(coalesce(e.prompt_data -> 'items', '[]')) i
  union all
  select a.exercise_id, 'explanation', a.explanation
  from public.exercise_answers a
  union all
  select a.exercise_id, 'model_answer', a.answer_data ->> 'modelAnswer'
  from public.exercise_answers a
  where a.answer_data ? 'modelAnswer'
  union all
  select a.exercise_id, 'rubric.' || (r ->> 'id'), r ->> 'text'
  from public.exercise_answers a,
    jsonb_array_elements(coalesce(a.answer_data -> 'rubric', '[]')) r
),
vi (entity_id, field, text) as (
  values
  -- 2001 multiple choice: static testing
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002001'::uuid, 'question',
   'Hoạt động nào dưới đây là kiểm thử, dù không chạy dòng code nào?'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002001'::uuid, 'option.review',
   'Review requirement để tìm chỗ thiếu và chỗ mâu thuẫn'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002001'::uuid, 'option.coding', 'Viết code cho tính năng'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002001'::uuid, 'option.deploy', 'Deploy bản release lên production'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002001'::uuid, 'option.estimate', 'Ước lượng sprint'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002001'::uuid, 'explanation',
   $vi$Review requirement là **static testing**: bạn tìm vấn đề mà không cần chạy gì cả. Nó tìm ra defect ở thời điểm rẻ nhất, trước khi có dòng code nào. Viết code, deploy và ước lượng không phải là hoạt động kiểm thử.$vi$),
  -- 2002 classification: error, defect, failure
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'question',
   'Xếp mỗi tình huống vào **error**, **defect** hoặc **failure**.'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'category.error', 'Error (lỗi của con người)'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'category.defect', 'Defect (khiếm khuyết trong sản phẩm)'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'category.failure', 'Failure (hành vi sai quan sát được)'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'item.misread',
   'Developer đọc nhầm quy tắc giảm giá trong requirement'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'item.wrong-rate',
   'Code áp dụng giảm 10 % trong khi quy tắc là 15 %'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'item.charged',
   'Khách hàng bị tính sai số tiền khi thanh toán'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'item.null-check',
   'Hàm tính giá không kiểm tra trường hợp giỏ hàng trống'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'item.crash',
   'Trang checkout bị crash khi giỏ hàng trống'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002002'::uuid, 'explanation',
   $vi$Chuỗi là **error → defect → failure**: một người mắc lỗi (error), để lại khiếm khuyết trong sản phẩm (defect), và khiếm khuyết đó lộ ra thành hành vi sai khi code chạy (failure). Một defect không bao giờ được thực thi thì không gây ra failure.$vi$),
  -- 2003 bug report: discount
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'question', $vi$Viết bug report cho điều bạn quan sát được.

Khi test checkout trên **staging** (Chrome 128, Windows 11), bạn thêm một sản phẩm giá 20.00 USD vào giỏ và áp mã giảm giá `SAVE15` (giảm 15 %). Phần tóm tắt đơn hàng hiển thị tổng **18.00 USD**. Theo đặc tả, tổng phải là 17.00 USD.$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'explanation',
   $vi$Một bug report tốt giúp người không có mặt lúc đó tái hiện được vấn đề. Con số rất quan trọng: "tổng tiền bị sai" là chưa đủ, "18.00 thay vì 17.00" mới đủ. Khách hàng bị tính sai giá nên mức ảnh hưởng là **major** (không phải critical: checkout vẫn hoạt động), và cần sửa gấp nên priority là **high**.$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'model_answer', $vi$**Title:** Tổng tiền checkout bỏ sót một phần giảm giá SAVE15 (18.00 thay vì 17.00 USD)

**Environment:** staging, Chrome 128, Windows 11

**Steps to reproduce:**

1. Thêm một sản phẩm giá 20.00 USD vào giỏ hàng.
2. Vào checkout.
3. Áp mã giảm giá SAVE15.

**Actual result:** tổng đơn hàng là 18.00 USD.

**Expected result:** tổng đơn hàng là 17.00 USD (giảm 15 % của 20.00).

**Severity:** major (tính sai tiền, nhưng checkout vẫn chạy). **Priority:** high (khách hàng trả sai giá).$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'rubric.title',
   'Title của tôi nói rõ cái gì sai và ở đâu, không cần mở report'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'rubric.repro',
   'Người khác có thể tái hiện chỉ bằng các bước của tôi'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'rubric.results',
   'Tôi ghi cả tổng thực tế và tổng mong đợi, có con số'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'rubric.env',
   'Tôi ghi rõ môi trường và trình duyệt'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002003'::uuid, 'rubric.sev-pri',
   'Tôi tách bạch severity (mức ảnh hưởng) và priority (mức khẩn cấp)'),
  -- 2004 multiple choice (several answers): principles
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'question',
   'Những điều nào dưới đây thuộc bảy nguyên tắc kiểm thử? Chọn tất cả đáp án đúng.'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'option.exhaustive', 'Không thể kiểm thử toàn bộ (exhaustive testing)'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'option.clustering', 'Defect thường tập trung thành cụm'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'option.no-defects', 'Kiểm thử chứng minh rằng không có defect'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'option.early', 'Kiểm thử sớm tiết kiệm thời gian và chi phí'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'option.automate', 'Mọi thứ đều nên được tự động hoá'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002004'::uuid, 'explanation',
   $vi$Không thể kiểm thử toàn bộ, defect tập trung thành cụm, và kiểm thử sớm tiết kiệm thời gian và chi phí là ba trong bảy nguyên tắc. Kiểm thử cho thấy defect **có mặt**, không bao giờ chứng minh được chúng không tồn tại; còn "tự động hoá mọi thứ" hoàn toàn không phải là một nguyên tắc.$vi$),
  -- 2005 scenario: exhaustive testing
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'question', $vi$Quản lý của bạn nói: *"Hãy chạy mọi giá trị có thể qua ô nhập tuổi mới (tuổi hợp lệ từ 18 đến 65) để chắc chắn nó không có bug."*

Bạn trả lời thế nào, và bạn sẽ test những gì thay vào đó?$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'explanation',
   $vi$Đây là nguyên tắc **không thể kiểm thử toàn bộ**: ngay cả một ô nhập đơn giản cũng có nhiều giá trị hơn mức bạn chạy được. Các kỹ thuật test design chọn ra một tập nhỏ giá trị tìm được phần lớn defect: **equivalence partitioning** (một giá trị cho mỗi nhóm) và **boundary value analysis** (giá trị nằm trên và sát mỗi biên).$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'model_answer', $vi$Không thể test mọi giá trị (và dù có làm được thì cũng không chứng minh được là không có bug), nên tôi chọn những giá trị dễ tìm ra bug nhất:

* **Equivalence partitions:** dưới 18, 18–65, trên 65: mỗi nhóm một giá trị là đủ, ví dụ 10, 40, 80.
* **Boundary values:** 17, 18, 65 và 66, nơi các lỗi lệch một đơn vị hay ẩn nấp.
* **Invalid input:** để trống, số âm, chữ cái, số thập phân.

Khoảng mười test thay vì hàng triệu, và chúng nhắm đúng vào chỗ rủi ro.$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'rubric.impossible',
   'Tôi giải thích được vì sao không thể test mọi giá trị'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'rubric.partitions',
   'Tôi chia input thành các nhóm hợp lệ và không hợp lệ'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'rubric.boundaries',
   'Tôi test trên và sát ngoài cả hai biên (17, 18, 65, 66)'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002005'::uuid, 'rubric.invalid',
   'Tôi có thử input hoàn toàn không phải là số'),
  -- 2006 test case: login
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'question',
   'Viết một test case cho form đăng nhập: người dùng đã đăng ký đăng nhập bằng email và mật khẩu hợp lệ và vào được dashboard.'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'explanation',
   $vi$Một test case phải lặp lại được bởi người khác: **preconditions** đặt trạng thái ban đầu, **test data** cụ thể, mỗi **step** là một thao tác, và **expected result** quan sát được, để verdict là pass hoặc fail rõ ràng. Đăng nhập là luồng cốt lõi nên priority là high.$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'model_answer', $vi$| Trường | Giá trị |
|---|---|
| Test case ID | TC-LOGIN-001 |
| Title | Người dùng đã đăng ký đăng nhập bằng email và mật khẩu hợp lệ |
| Preconditions | Tài khoản learner@example.com đã tồn tại và đã xác minh; người dùng đang đăng xuất |
| Test data | Email learner@example.com, mật khẩu Correct-Pass-1 |
| Steps | 1. Mở trang đăng nhập. 2. Nhập email. 3. Nhập mật khẩu. 4. Bấm **Log in**. |
| Expected result | Dashboard mở ra và hiển thị tên người dùng |
| Priority | High |
| Test type | Functional |$vi$),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'rubric.one-thing',
   'Test case của tôi chỉ kiểm tra một điều'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'rubric.preconditions',
   'Preconditions nói rõ điều gì phải đúng trước bước 1'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'rubric.data',
   'Tôi đưa test data cụ thể, không phải "một email hợp lệ"'),
  ('6f1d2a4e-0c1b-4d7e-9a3f-000000002006'::uuid, 'rubric.expected',
   'Expected result có thể kiểm tra được là pass hay fail')
)
insert into public.content_translations
  (entity_type, entity_id, field, language, source_hash, text, provider)
select
  'exercise',
  vi.entity_id,
  vi.field,
  'vi',
  encode(sha256(convert_to(source.text, 'UTF8')), 'hex'),
  vi.text,
  'manual'
from vi
join source using (entity_id, field)
on conflict (entity_type, entity_id, field, language, provider)
do update set text = excluded.text, source_hash = excluded.source_hash;
