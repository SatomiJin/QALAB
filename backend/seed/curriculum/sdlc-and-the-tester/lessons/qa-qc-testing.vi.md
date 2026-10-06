Các chức danh công việc dùng lẫn lộn những từ này ("QA engineer", "đội QC", "tester"), nhưng trong nghề, **quality assurance**, **quality control** và **testing** mang những nghĩa khác nhau. Hiểu sự khác biệt giúp bạn giải thích công việc của mình và thấy được chất lượng thực sự được giữ vững hay đánh mất ở đâu.

## Ba phạm vi

Ba thuật ngữ này lồng vào nhau, từ rộng nhất đến hẹp nhất:

* **Quality assurance (QA)** (đảm bảo chất lượng) xoay quanh **quy trình**: thiết lập cách nhóm làm việc sao cho defect được *ngăn ngừa*.
* **Quality control (QC)** (kiểm soát chất lượng) xoay quanh **sản phẩm**: kiểm tra những gì đã xây dựng để defect được *phát hiện* trước khi đến tay người dùng.
* **Testing** là một trong những hoạt động QC chính: đánh giá phần mềm, bằng cách chạy hoặc xem xét nó, để tìm defect và cung cấp thông tin về chất lượng.

```text
Quality management
└── Quality assurance (process, prevention)
    └── Quality control (product, detection)
        └── Testing
```

## Quality assurance: ngăn ngừa

QA đặt câu hỏi: *cách chúng ta làm việc có khả năng tạo ra phần mềm tốt không?* Nó xem xét cách viết requirement, cách review code, những chuẩn nhóm tuân theo và cách nhóm học từ sai lầm. Các hoạt động QA điển hình:

* Định nghĩa coding standard và checklist review.
* Thống nhất rằng mọi story phải có acceptance criteria trước khi sprint bắt đầu.
* Đào tạo nhóm về một công cụ hay kỹ thuật mới.
* Phân tích nguyên nhân gốc (root cause) của các bug lọt ra ngoài và thay đổi quy trình trong buổi retrospective.
* Audit xem quy trình đã thống nhất có thực sự được làm theo không.

Công việc QA hiếm khi tìm ra một bug cụ thể. Thành công của nó thể hiện ở chỗ ngay từ đầu đã có *ít* bug được tạo ra hơn.

## Quality control: phát hiện

QC đặt câu hỏi: *sản phẩm này, hoặc phần này của nó, có đáp ứng requirement không?* Nó xem xét một sản phẩm công việc cụ thể, như một build, một tài liệu hay một release candidate. Các hoạt động QC điển hình:

* Chạy test case trên một build và báo bug.
* Review một tài liệu requirement cụ thể để tìm các case bị thiếu.
* Kiểm tra một bản release theo exit criteria của nó.
* Đo số defect tìm được cho mỗi tính năng để quyết định nó đã sẵn sàng chưa.

## So sánh

| | Quality assurance | Quality control | Testing |
|---|---|---|---|
| Trọng tâm | Quy trình | Sản phẩm | Sản phẩm |
| Mục tiêu | Ngăn ngừa defect | Phát hiện defect | Tìm defect, cung cấp thông tin |
| Câu hỏi | Chúng ta có làm việc đúng cách không? | Sản phẩm này đã đủ tốt chưa? | Nó có hoạt động như mong đợi không? |
| Thời điểm | Suốt dự án | Khi đã có sản phẩm công việc | Khi đã có sản phẩm công việc |
| Ví dụ | Đưa vào một checklist review | Kiểm tra bản release theo exit criteria | Chạy các test case của checkout |
| Trách nhiệm | Cả nhóm, do QA hoặc quản lý dẫn dắt | Tester, reviewer | Tester, developer |

## Một ví dụ cụ thể

Một nhóm liên tục release bug liên quan đến xử lý ngày tháng (múi giờ, cuối tháng).

* **Testing / QC:** tester chạy boundary test vào ngày 31 tháng 1 và 1 tháng 2, tìm ra hai defect và báo cáo. Hai bug đó được sửa.
* **QA:** trong buổi retrospective, nhóm thêm "các case ngày tháng và múi giờ" vào checklist của story, và thêm một hàm tiện ích chung cho ngày tháng vào coding standard. Sprint sau, ngay từ đầu đã ít bug ngày tháng được viết ra hơn.

Cả hai đều cần thiết. Phát hiện mà không ngăn ngừa nghĩa là mãi mãi đi tìm cùng một loại bug; ngăn ngừa mà không phát hiện nghĩa là tin vào một quy trình không ai kiểm tra.

## Chất lượng là trách nhiệm của cả nhóm

Dù mang chức danh "QA engineer", bạn không một mình *sở hữu* chất lượng, và bạn không thể "test cho ra chất lượng" vào sản phẩm ở phút cuối. Developer ngăn ngừa defect bằng review và unit test, Product Owner bằng story rõ ràng, còn tester hỗ trợ tất cả họ, điều này gắn trực tiếp với shift-left ở bài trước.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.2.2 "Testing and quality assurance (QA)". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: QA cải tiến quy trình để ngăn ngừa defect, QC kiểm tra sản phẩm để phát hiện defect, và testing là hoạt động QC chính. Một QA engineer giỏi làm cả hai: tìm bug trong sản phẩm và giúp thay đổi quy trình để chúng không bị tạo ra lần nữa.
