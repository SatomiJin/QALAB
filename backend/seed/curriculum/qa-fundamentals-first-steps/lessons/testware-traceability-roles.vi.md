Mỗi hoạt động kiểm thử đều để lại thứ gì đó: một bản kế hoạch, một danh sách test case, một log, một bug report. Gộp lại, các sản phẩm công việc này được gọi là **testware**. Bài này nói về testware mà một nhóm tạo ra, vì sao liên kết nó với requirement (**traceability** — khả năng truy vết) lại đáng công, và ai làm phần việc nào.

## Testware: mỗi hoạt động tạo ra gì

Mỗi tổ chức đặt tên và trình bày tài liệu khác nhau, nhưng nội dung thì ở đâu cũng nhận ra được:

| Hoạt động | Testware điển hình |
|---|---|
| Test planning | Test plan, lịch test, risk register, entry và exit criteria |
| Monitoring và control | Báo cáo tiến độ test, các quyết định để quay lại đúng hướng |
| Test analysis | Test condition đã ưu tiên (ví dụ acceptance criteria), defect tìm thấy trong requirement |
| Test design | Test case, test charter, coverage item, yêu cầu về test data và môi trường |
| Test implementation | Test procedure, script thủ công và tự động, test suite, test data, lịch thực thi, stub và simulator |
| Test execution | Test log, defect report |
| Test completion | Test completion report, bài học kinh nghiệm, hành động cải tiến, change request cho defect còn mở |

**Risk register** (sổ rủi ro) liệt kê từng rủi ro với khả năng xảy ra, mức ảnh hưởng và cách xử lý. Testware thay đổi khi sản phẩm thay đổi, nên nó được quản lý bằng **configuration management**: có phiên bản, để ai cũng biết test case nào thuộc bản release nào.

## Traceability: nối mọi thứ lại với nhau

**Traceability** là giữ liên kết giữa **test basis** (requirement, user story, rủi ro) với testware và kết quả được xây dựa trên nó:

```text
Requirement REQ-12  "Password must be 8-72 characters"
  └── Test condition  password length limits
        ├── TC-031  7 characters  → rejected   Pass
        ├── TC-032  8 characters  → accepted   Pass
        ├── TC-033  72 characters → accepted   Fail → BUG-207
        └── TC-034  73 characters → rejected   Pass
```

Nhờ các liên kết này, nhóm trả lời được những câu hỏi mà nếu không có thì chỉ là đoán:

* **Coverage**: requirement nào cũng có ít nhất một test chưa? REQ-15 chưa có test nào, tức là chưa được test.
* **Rủi ro còn lại**: rủi ro nào chưa được cover hoặc đang fail? REQ-12 còn một bug mở ở biên trên.
* **Ảnh hưởng của thay đổi**: quy tắc mật khẩu đổi thành 10–64 ký tự; đúng TC-031 đến TC-034 phải cập nhật.
* **Báo cáo**: "11 trên 12 requirement pass" có ý nghĩa với quản lý hơn "143 trên 150 test case pass".
* **Audit**: trong lĩnh vực chịu quản lý chặt, bằng chứng rằng mọi requirement đã được test thường là bắt buộc.

Trong thực tế, các liên kết nằm trong công cụ quản lý test, trong Jira (một test được link với một story), hoặc trong một **traceability matrix** đơn giản: requirement là hàng, test case là cột.

## Hai vai trò trong kiểm thử

Syllabus ISTQB mô tả hai vai trò chính. Đây là vai trò, không phải chức danh: một người có thể giữ cả hai, và những người khác nhau có thể giữ chúng vào những thời điểm khác nhau.

| | Vai trò quản lý test | Vai trò kiểm thử |
|---|---|---|
| Chịu trách nhiệm | Quy trình test, nhóm test, dẫn dắt các hoạt động test | Phần kỹ thuật của kiểm thử |
| Hoạt động chính | Planning, monitoring và control, completion | Analysis, design, implementation, execution |
| Câu hỏi điển hình | Có đúng lịch không? Release bây giờ thì rủi ro là gì? | Test cái gì? Test thế nào? Có pass không? |
| Ai làm | Test manager, team lead, development manager, hoặc chính nhóm Agile | Tester, QA engineer, thường cả developer |

Trong nhóm Agile, phần lớn việc quản lý test được cả nhóm chia nhau; việc trải qua nhiều nhóm (chiến lược release, công cụ test) có thể do một test manager bên ngoài đảm nhận. Là QA engineer mới vào nghề, bạn bắt đầu ở vai trò kiểm thử; viết testware rõ ràng và giữ traceability là điều chuẩn bị cho bạn bước sang phía quản lý.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.4.3 "Testware", 1.4.4 "Traceability between the test basis and testware" và 1.4.5 "Roles in testing". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: mỗi hoạt động kiểm thử tạo ra testware; traceability nối nó với requirement và rủi ro để nhóm thấy được coverage, rủi ro còn lại và ảnh hưởng của một thay đổi. Vai trò quản lý test lái quy trình, vai trò kiểm thử làm phần kỹ thuật, và một người có thể làm cả hai.
