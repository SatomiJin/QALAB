-- Sample content, applied after migrations by `supabase db push --include-seed`
-- (cloud) or `supabase db reset` (local). Idempotent: fixed ids; existing
-- content rows are left untouched, translations are refreshed. Skills are
-- reference data and live in the
-- 20260930024128_learning migration. The full curriculum arrives in Phase 6.

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
