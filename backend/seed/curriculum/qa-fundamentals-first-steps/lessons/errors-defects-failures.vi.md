Ba từ mô tả chuỗi đi từ một sai lầm của con người đến một vấn đề nhìn thấy được. Bug report và test report dùng chúng rất chính xác.

## Chuỗi nguyên nhân

1. **Error (mistake — sai lầm)**: một người làm sai điều gì đó. Developer đọc nhầm "ít nhất 18" thành "lớn hơn 18".
2. **Defect (bug, fault — lỗi)**: kết quả nằm trong sản phẩm công việc. Code ghi `age > 18` thay vì `age >= 18`.
3. **Failure (hỏng hóc)**: hệ thống làm điều nó không được làm, khi defect được thực thi. Người đúng 18 tuổi không đăng ký được.

Không phải defect nào cũng gây ra failure: nếu chưa ai đúng 18 tuổi đăng ký, failure sẽ không bao giờ lộ ra. Có defect lần nào chạy cũng gây failure, có defect chỉ gây failure trong điều kiện đặc biệt, và có defect không bao giờ gây failure. Đó là lý do **boundary value** (giá trị biên) được test một cách có chủ đích.

## Defect nằm ở đâu

Con người mắc error vì những lý do rất bình thường: áp lực thời gian, công việc phức tạp, công nghệ chưa quen, mệt mỏi, thiếu đào tạo. Defect họ để lại không chỉ nằm trong code:

* requirement hoặc user story (thiếu một quy tắc, mâu thuẫn),
* thiết kế hoặc đặc tả API,
* test script hoặc test data (chính test bị sai),
* file build hoặc cấu hình.

Defect trong một sản phẩm công việc ở giai đoạn sớm sẽ lan ra: requirement sai dẫn tới thiết kế sai, code sai và test sai. Tìm ra nó ngay ở requirement là cách sửa rẻ nhất.

Failure cũng có thể đến từ nguyên nhân bên ngoài phần mềm. Điều kiện môi trường như bức xạ, từ trường hay lỗi phần cứng có thể làm hỏng dữ liệu hoặc firmware. Trước khi báo một failure là bug, hãy kiểm tra môi trường có ổn không.

## Root cause

**Root cause** (nguyên nhân gốc) là lý do cơ bản đằng sau error: requirement không rõ, áp lực thời gian, thiếu review. **Root cause analysis** (phân tích nguyên nhân gốc) được làm khi xảy ra failure hoặc tìm thấy defect. Sửa defect thì hết một bug; loại bỏ root cause thì ngăn được, hoặc giảm bớt, những bug tương tự tiếp theo.

## Ví dụ

| | Ví dụ |
|---|---|
| Error | Requirement "miễn phí vận chuyển từ $50" bị hiểu thành "trên $50" |
| Defect | `if (total > 50)` trong code thanh toán |
| Failure | Đơn hàng đúng $50.00 vẫn bị tính phí vận chuyển |
| Root cause | Requirement không đưa ví dụ ở giá trị biên |

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.2.3 "Errors, defects, failures, and root causes". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Trong bug report, bạn mô tả **failure** (điều bạn quan sát được). Developer sẽ tìm ra **defect**; root cause analysis tìm ra vì sao nó bị tạo ra.
