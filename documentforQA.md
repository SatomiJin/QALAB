# QALAB --- Free QA/QC Learning Sources & Data Collection Brief

> Mục tiêu: thu thập và chuẩn hóa nguồn học QA/QC miễn phí cho QALAB. Ưu
> tiên tài liệu chính thức, nội dung có cấu trúc, bài tập thực hành và
> đáp án.\
> Ngôn ngữ nội dung: ưu tiên tiếng Việt nếu có; nếu nguồn là tiếng Anh,
> có thể tạo bản giải thích tiếng Việt do team biên soạn, nhưng phải giữ
> link nguồn và không dịch/sao chép nguyên văn toàn bộ tài liệu khi giấy
> phép không cho phép.

## 1. Danh sách nguồn học ưu tiên

### A. QA Foundation / Software Testing Fundamentals

#### 1. ISTQB --- Certified Tester Foundation Level (CTFL) v4.0.1

- URL:
    <https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/>
- Tài liệu syllabus:
    <https://www.istqb.org/sdm_downloads/istqb-certified-tester-foundation-level-syllabus-v4-0/>
- Loại: syllabus, glossary/thuật ngữ nếu được cung cấp, sample exams
    và answer keys.
- Chủ đề gợi ý:
  - Fundamentals of Testing
  - Testing in the Software Development Lifecycle
  - Static Testing
  - Test Analysis and Design
  - Managing Test Activities
  - Test Tools
- Độ khó: Beginner → Intermediate
- Cách dùng: dùng syllabus làm khung chương trình và tham chiếu thuật
    ngữ. Tạo bài giải thích bằng lời của team, không mặc định được phép
    sao chép nguyên văn câu hỏi/đáp án.
- Lưu ý: tài liệu tự học có thể miễn phí; kỳ thi chứng chỉ có thể mất
    phí.

#### 2. Ministry of Testing

- URL: <https://www.ministryoftesting.com/>
- Loại: bài viết, hướng dẫn, cộng đồng và một số nội dung đào tạo.
- Chủ đề: testing mindset, exploratory testing, test strategy,
    collaboration, test leadership.
- Độ khó: Beginner → Advanced
- Lưu ý: không phải tất cả khóa học/nội dung đều miễn phí. Chỉ thu
    thập nội dung được truy cập hợp pháp và kiểm tra điều khoản sử dụng.

#### 3. Atlassian --- Jira Software Documentation / Learning

- Documentation: <https://support.atlassian.com/jira-software-cloud/>
- Learning: <https://www.atlassian.com/university>
- Loại: hướng dẫn Jira, issue, workflow, backlog và quản lý công việc.
- Chủ đề: bug/issue tracking, workflow, backlog, sprint, phối hợp
    QA--Dev.
- Độ khó: Beginner → Intermediate
- Cách dùng: xây bài tập tạo bug ticket, cập nhật trạng thái và theo
    dõi defect.

### B. Manual Testing / Test Design

Dùng ISTQB CTFL làm khung nền tảng, sau đó tạo bài thực hành nội bộ theo
các kỹ thuật: - Equivalence Partitioning - Boundary Value Analysis -
Decision Table Testing - State Transition Testing - Statement/branch
coverage ở mức khái niệm - Exploratory Testing - Regression Testing và
Retesting - Test Scenario, Test Case, Test Data, Expected Result -
Severity vs Priority - Defect lifecycle và bug report

Nguồn tham chiếu: - ISTQB CTFL:
<https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/> -
Ministry of Testing: <https://www.ministryoftesting.com/>

**Bài tập tự tạo cho QALAB:** đăng nhập, tìm kiếm, giỏ hàng, tạo đơn,
cập nhật trạng thái đơn, hủy đơn và hoàn trả. Dùng dữ liệu giả lập;
không dùng thông tin cá nhân hoặc dữ liệu production.

### C. API Testing

#### 4. Postman Learning Center

- URL: <https://learning.postman.com/>
- Quick start:
    <https://learning.postman.com/docs/getting-started/quick-start>
- API tests and scripts:
    <https://learning.postman.com/latest-v-12/docs/tests-and-scripts/tests-and-scripts>
- Loại: tài liệu hướng dẫn, quick start, ví dụ request và test
    scripts.
- Chủ đề:
  - HTTP methods, status codes, headers
  - Path/query parameters và request body
  - JSON response validation
  - Authentication basics
  - Collections, environments và variables
  - Assertions, negative tests và API workflow
- Độ khó: Beginner → Intermediate
- Bài tập QALAB: kiểm tra API đăng nhập, danh sách sản phẩm, tạo đơn
    và truy vấn chi tiết đơn. Dùng API demo hoặc mock API, không gửi
    request không được phép tới hệ thống thật.

### D. SQL / Database Testing

#### 5. SQLBolt

- URL: <https://sqlbolt.com/>
- Danh sách bài học: <https://sqlbolt.com/topic/>
- Loại: bài học tương tác và bài tập trực tiếp trên trình duyệt.
- Chủ đề:
  - SELECT, WHERE, ORDER BY
  - JOIN và OUTER JOIN
  - NULL, expressions và aggregates
  - GROUP BY và thứ tự thực thi truy vấn
  - INSERT, UPDATE, DELETE và tạo bảng
  - Subqueries và set operations
- Độ khó: Beginner → Intermediate
- Bài tập QALAB: xác minh dữ liệu đơn hàng, tổng tiền, số lượng item,
    trạng thái và quan hệ giữa order/order_item trên database giả lập.
- Lưu ý: chỉ thực hành câu lệnh thay đổi dữ liệu trên môi trường học
    tập riêng.

### E. Automation Testing

#### 6. Playwright --- Official Documentation

- URL: <https://playwright.dev/docs/intro>
- Writing tests: <https://playwright.dev/docs/writing-tests>
- Official repository: <https://github.com/microsoft/playwright>
- Loại: documentation, tutorials, ví dụ code và repository.
- Chủ đề:
  - Cài đặt và viết test đầu tiên
  - Locators và assertions
  - Auto-waiting và actionability
  - Test isolation, fixtures và hooks
  - Page Object Model
  - API testing
  - Screenshots, traces, reports và CI
- Độ khó: Beginner → Advanced
- Stack gợi ý cho QALAB: TypeScript + Playwright.
- Cách dùng: tạo bài học và ví dụ nhỏ mới; nếu tái sử dụng code từ
    repository, kiểm tra LICENSE và giữ attribution/notice theo yêu cầu.

#### 7. Cypress Documentation (nguồn thay thế/bổ sung)

- URL: <https://docs.cypress.io/>
- Loại: tài liệu chính thức và ví dụ.
- Chủ đề: end-to-end testing, assertions, fixtures, network requests
    và test organization.
- Độ khó: Beginner → Advanced
- Lưu ý: ưu tiên để học viên biết thêm công cụ; không cần dạy song
    song với Playwright ở giai đoạn đầu.

### F. Web Security Testing (mức nhập môn)

#### 8. OWASP Web Security Testing Guide (WSTG)

- Project page: <https://owasp.org/projects/web-security-testing-guide>
- Stable guide: <https://wstg.owasp.org/>
- Official repository: <https://github.com/OWASP/wstg>
- Loại: hướng dẫn kiểm thử bảo mật web có cấu trúc.
- Chủ đề: information gathering, configuration, identity,
    authentication, authorization, session management, input validation
    và reporting.
- Độ khó: Intermediate
- License: trang dự án công bố Creative Commons Attribution-Share
    Alike 4.0 International cho guide; vẫn cần xác minh license/điều
    kiện của đúng phiên bản và từng asset trước khi nhập lại.
- Cách dùng: chỉ xây bài học nhận thức và checklist kiểm thử trong lab
    được phép. Không kiểm thử hệ thống bên thứ ba khi chưa có quyền.

------------------------------------------------------------------------

## 2. Thứ tự nhập nội dung vào QALAB

1. QA Foundation --- thuật ngữ, mục tiêu kiểm thử, SDLC/STLC, test
    levels/types.
2. Manual Testing --- test design, test case, test data, expected
    result.
3. Bug Report & Jira --- mô tả lỗi, evidence, severity/priority, defect
    lifecycle.
4. API Testing --- HTTP, JSON, Postman, assertions và negative cases.
5. SQL for QA --- SELECT, JOIN, GROUP BY, đối soát dữ liệu.
6. Automation --- Playwright + TypeScript, locators, assertions,
    fixtures, POM, reports.
7. Security Awareness --- kiến thức nhập môn và checklist từ OWASP.
8. Project Practice --- bài tập mô phỏng quy trình OMS/e-commerce bằng
    dữ liệu giả lập.

## 3. Yêu cầu thu thập dữ liệu cho Claude

Hãy thực hiện theo các quy tắc sau:

### Quy tắc truy cập và bản quyền

- Chỉ truy cập trang công khai, tài liệu được phép tải và API được
    phép sử dụng.
- Tôn trọng Terms of Service, robots.txt, rate limits và yêu cầu đăng
    nhập/paywall.
- Không vượt paywall, không dùng tài khoản của người khác, không tìm
    cách né cơ chế chống bot.
- Không thu thập nội dung khóa học trả phí hoặc nội dung cần đăng nhập
    nếu không có quyền.
- Không giả định "có thể xem miễn phí" nghĩa là "được phép sao chép
    hoặc tái phân phối".
- Với license không rõ, chỉ lưu metadata + URL + ghi chú do team tự
    viết; đánh dấu `license_status: "needs_review"`.
- Với nội dung có thể tái sử dụng, lưu license, attribution bắt buộc
    và URL/phiên bản gốc.
- Không sao chép nguyên văn toàn bộ bài viết, syllabus, sách, câu hỏi
    thi hoặc đáp án có bản quyền vào QALAB.
- Không lưu thông tin cá nhân, token, cookie, API key, dữ liệu
    production hay thông tin nội bộ của công ty.

### Quy trình thu thập

1. Lập danh mục nguồn và URL cụ thể.
2. Xác minh URL hoạt động, tiêu đề, tác giả/tổ chức, ngày cập
    nhật/phiên bản, ngôn ngữ và loại tài nguyên.
3. Ghi rõ nội dung miễn phí hoàn toàn, miễn phí một phần hay cần trả
    phí.
4. Kiểm tra license/Terms of Use trước khi trích xuất nội dung.
5. Nếu được phép, trích xuất đúng phạm vi cho phép và giữ attribution.
6. Nếu không rõ quyền sử dụng, chỉ tạo bản tóm tắt nguyên bản bằng lời
    của team, kèm link nguồn; không lưu bản sao toàn văn.
7. Tạo learning objectives, giải thích bằng tiếng Việt, ví dụ tự tạo và
    bài tập tự tạo.
8. Kiểm tra kỹ thuật và chuyên môn trước khi đánh dấu `reviewed`.
9. Lưu lỗi crawl, trang bị bỏ qua và lý do; không bịa dữ liệu thiếu.

### Chất lượng nội dung

- Không bịa định nghĩa, đáp án, phiên bản hoặc URL.
- Phân biệt rõ trích dẫn nguồn với phần giải thích do team tự viết.
- Với thuật ngữ quan trọng, ưu tiên ISTQB glossary/syllabus hoặc tài
    liệu chính thức của công cụ.
- Mỗi bài cần có mục tiêu học tập, nội dung, ví dụ, bài tập và nguồn
    tham khảo.
- Đáp án quiz phải có giải thích ngắn và được người review xác minh.
- Không tạo câu hỏi giả rồi gán nhầm là câu hỏi chính thức của ISTQB.
- Đánh dấu nội dung chưa được review là `draft`, không xuất bản tự
    động.

------------------------------------------------------------------------

## 4. Schema dữ liệu gợi ý

Điều chỉnh tên trường theo schema/API hiện tại của QALAB; không tự ý
thay đổi database production.

``` json
{
  "title": "Tên bài học",
  "slug": "ten-bai-hoc",
  "topic": "manual-testing",
  "level": "beginner",
  "language": "vi",
  "learning_objectives": [
    "Mục tiêu 1",
    "Mục tiêu 2"
  ],
  "content": [
    {
      "type": "heading",
      "text": "Tiêu đề mục"
    },
    {
      "type": "paragraph",
      "text": "Phần giải thích do team biên soạn"
    },
    {
      "type": "example",
      "text": "Ví dụ tự tạo"
    }
  ],
  "exercises": [],
  "quiz_questions": [],
  "source": {
    "title": "Tên tài liệu gốc",
    "url": "https://example.com/",
    "publisher": "Tổ chức phát hành",
    "version": "Phiên bản nếu có",
    "last_verified_at": "YYYY-MM-DD",
    "license": "Tên license hoặc unknown",
    "license_status": "verified | needs_review | restricted",
    "attribution": "Yêu cầu ghi công nếu có"
  },
  "review_status": "draft"
}
```

## 5. Checklist trước khi publish

- [ ] URL nguồn hoạt động và đúng chủ đề.
- [ ] Đã ghi tổ chức/tác giả, phiên bản và ngày xác minh.
- [ ] Đã kiểm tra license/Terms of Use.
- [ ] Nội dung giải thích bằng tiếng Việt là bản biên soạn của team
    hoặc được phép tái sử dụng.
- [ ] Ví dụ và bài tập tự tạo hoặc có giấy phép phù hợp.
- [ ] Đáp án đã được xác minh.
- [ ] Không chứa secrets, dữ liệu cá nhân hoặc dữ liệu production.
- [ ] Đã có người review chuyên môn.
- [ ] Đã kiểm tra hiển thị trên QALAB.

## 6. Kết quả Claude cần bàn giao

1. `sources_manifest.csv` --- danh sách URL, chủ đề, loại tài nguyên,
    trạng thái miễn phí, license và trạng thái xác minh.
2. Nội dung bài học ở định dạng mà API hiện tại của QALAB chấp nhận.
3. `crawl_report.md` --- nguồn thành công/thất bại, lỗi và các nguồn
    cần kiểm tra thủ công.
4. `license_review.md` --- nguồn được phép tái sử dụng, nguồn chỉ nên
    liên kết/tóm tắt và nguồn chưa rõ license.
5. `quality_report.md` --- bài học thiếu mục tiêu, ví dụ, bài tập, đáp
    án hoặc review.
6. Không sửa code/schema hoặc ghi thẳng vào production nếu chưa được
    yêu cầu. Trước khi import hàng loạt, tạo bản preview và kiểm tra một
    số bài mẫu.

**Ưu tiên đợt 1:** ISTQB CTFL làm khung kiến thức; SQLBolt cho bài tập
SQL; Postman cho API; Playwright cho automation. Sau khi các bài đầu
tiên được review và import thành công, mới mở rộng sang các nguồn khác.
