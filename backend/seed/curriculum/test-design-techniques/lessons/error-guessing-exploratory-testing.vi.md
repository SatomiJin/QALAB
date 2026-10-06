Các kỹ thuật từ đầu khóa đến giờ đều bắt đầu từ requirement. **Kỹ thuật dựa trên kinh nghiệm** (experience-based) bắt đầu từ chính tester: những gì bạn biết về cách phần mềm thường hỏng, và những gì bạn học được khi dùng nó. Chúng tìm ra các defect mà chưa ai viết requirement cho.

## Error guessing

**Error guessing** (đoán lỗi) là dự đoán các sai sót có khả năng xảy ra dựa trên kinh nghiệm, các defect cũ và những kiểu hỏng hóc phổ biến, rồi thiết kế test để làm lộ chúng. Làm tốt thì nó không hề ngẫu nhiên: bạn làm việc theo một danh sách.

Một **fault attack** là một lần cố ý kích hoạt một loại failure đã biết. Các attack điển hình:

| Khu vực | Attack |
|---|---|
| Nhập chữ | Để trống, chỉ có dấu cách, dấu cách ở đầu/cuối, 5,000 ký tự, emoji, `<script>`, dấu nháy `'` và `"` |
| Số | 0, số âm, số thập phân, số rất lớn, chữ cái, dấu phẩy thay cho dấu chấm |
| Thao tác | Bấm Submit hai lần liền, bấm Back sau khi thanh toán, refresh khi đang lưu, hai tab cùng sửa một mục |
| File | File rỗng, sai phần mở rộng, file cực lớn, file `.exe` đổi tên thành `.jpg` |
| Thời gian | Nửa đêm, cuối tháng, ngày 29 tháng 2, múi giờ khác |
| Mạng | Kết nối chậm, mất kết nối giữa chừng một request |

Hãy giữ một **checklist** như thế này, bổ sung nó sau mỗi defect nhóm tìm được, và chạy nó với mỗi tính năng mới. Như vậy kinh nghiệm cá nhân trở thành kiến thức của cả nhóm.

## Exploratory testing

**Exploratory testing** (kiểm thử khám phá) là học, thiết kế test và thực thi test **cùng một lúc**. Bạn không làm theo kịch bản: mỗi kết quả cho bạn biết nên thử gì tiếp theo. Nó lý tưởng khi:

* requirement còn sơ sài hoặc đang thay đổi,
* thời gian gấp và bạn cần phản hồi nhanh,
* các test theo kịch bản đều pass nhưng bạn nghi vẫn còn vấn đề,
* tính năng mới và chưa ai biết điểm yếu của nó.

"Khám phá" không có nghĩa là không có cấu trúc. Không có mục tiêu và ghi chép thì nó chỉ còn là bấm lung tung, và không ai biết đã phủ được những gì.

## Session-based test management

**Session-based test management** (SBTM) đem lại cấu trúc cho exploratory testing:

1. **Charter**: nhiệm vụ của session, viết trước khi bắt đầu.
2. **Time box**: một session không bị gián đoạn, thường từ 60 đến 120 phút.
3. **Ghi chú (notes)**: bạn đã test gì, tìm thấy gì, câu hỏi, ý tưởng cho lần sau.
4. **Debrief**: trao đổi ngắn với lead hoặc nhóm sau session: đã phủ những gì, defect, rủi ro, charter tiếp theo.

Một mẫu charter phổ biến:

> Khám phá **(đối tượng)** với **(nguồn lực: dữ liệu, công cụ, attack)** để phát hiện **(thông tin: rủi ro, defect)**.

Ví dụ: *Khám phá field coupon ở checkout với các mã hết hạn, mã đã dùng và mã rất dài để phát hiện cách hệ thống xử lý coupon không hợp lệ.*

Một charter tốt đủ tập trung để xong trong một session ("field coupon", không phải "checkout") và đủ mở để bạn đi theo những gì mình phát hiện.

## Checklist-based testing

**Checklist-based testing** là kỹ thuật dựa trên kinh nghiệm thứ ba: tester thiết kế và chạy test để cover các mục trong một checklist. Checklist đến từ kinh nghiệm, từ hiểu biết điều gì quan trọng với người dùng, và từ việc hiểu vì sao phần mềm hỏng (danh sách fault attack ở trên là một ví dụ).

Mục checklist tốt:

* được viết dưới dạng **câu hỏi** kiểm tra được từng cái một: "Mọi field bắt buộc có hiện lỗi khi để trống không?";
* không phải thứ công cụ tự kiểm tra được, không phải entry hay exit criteria, và không quá chung chung ("Có thân thiện với người dùng không?");
* được **cập nhật thường xuyên**: một mục sẽ thôi tìm ra defect khi developer đã học cách tránh lỗi đó, và defect nghiêm trọng mới sẽ thêm mục mới. Giữ danh sách đủ ngắn để còn dùng được.

Khi không có test case chi tiết, checklist cho định hướng và một mức nhất quán. Checklist ở mức cao khiến các tester làm khác nhau nhiều hơn: có thể cover rộng hơn, nhưng khó lặp lại hơn.

## Chúng phối hợp với nhau thế nào

Error guessing cho bạn các attack; các session khám phá cho bạn thời gian và cấu trúc để dùng chúng, và để lần theo những điều bất ngờ. Cả hai **bổ sung** cho test theo kịch bản chứ không thay thế: test theo kịch bản chứng minh requirement được đáp ứng và lặp lại được cho regression; session khám phá tìm ra những gì kịch bản không lường trước.

| | Scripted testing | Exploratory testing |
|---|---|---|
| Thiết kế test | Trước khi thực thi | Trong lúc thực thi |
| Điểm mạnh | Lặp lại được, coverage đo được | Tìm defect bất ngờ nhanh |
| Điểm yếu | Chỉ tìm được những gì đã lường trước | Phụ thuộc kỹ năng tester; khó lặp lại |
| Bằng chứng | Pass/fail cho từng test case | Charter, ghi chú session, defect, debrief |

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 4.4.1 "Error guessing", 4.4.2 "Exploratory testing" và 4.4.3 "Checklist-based testing". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.
* Cấu trúc session-based test management và mẫu charter ("Explore… with… to discover…") là cách làm phổ biến trong cộng đồng exploratory testing; syllabus mô tả session, charter và debrief ở mức tổng quát.

> Ý chính: dùng một checklist fault attack ngày càng dày thêm, và khám phá trong các session có time box với charter rõ ràng, ghi chú và debrief.
