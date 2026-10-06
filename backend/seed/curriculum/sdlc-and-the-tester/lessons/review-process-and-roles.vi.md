Bài trước cho thấy static testing tìm ra *những gì*. Bài này cho thấy một buổi review được tổ chức *như thế nào* để thực sự tìm ra vấn đề: vì sao phản hồi sớm quan trọng, các hoạt động của một buổi review, ai làm gì, và điều gì khiến review thành công hay thất bại.

## Vì sao cần phản hồi sớm và thường xuyên

Khi các bên liên quan chỉ thấy sản phẩm vào lúc cuối, nó có thể không còn khớp với điều họ muốn, hoặc điều họ muốn lúc này. Hậu quả là làm lại tốn kém, trễ hạn và đổ lỗi cho nhau. Phản hồi thường xuyên trong suốt quá trình phát triển:

* bắt được hiểu lầm về requirement khi còn rẻ để sửa,
* giúp thay đổi requirement được hiểu và làm sớm hơn,
* giúp nhóm tập trung vào những tính năng mang lại nhiều giá trị nhất và giảm những rủi ro lớn nhất.

Review là một trong những cách chính để có được phản hồi đó cho tài liệu, story và code.

## Quy trình review

Tiêu chuẩn ISO/IEC 20246 mô tả một quy trình review chung để mỗi nhóm điều chỉnh: review càng formal thì dùng càng nhiều phần của nó, review informal thì dùng ít hơn. Một sản phẩm công việc lớn có thể cần nhiều vòng review.

| Hoạt động | Diễn ra điều gì | Ví dụ: review story "hoàn tiền" |
|---|---|---|
| Planning | Xác định phạm vi: mục đích, review cái gì, chất lượng nào, chỗ cần tập trung, exit criteria, công sức và thời gian | "Kiểm tra story hoàn tiền có test được không; xong khi không còn vấn đề major nào mở" |
| Review initiation | Bảo đảm mọi người truy cập được tài liệu, biết vai trò của mình và có đủ thứ cần thiết | Gửi story, chính sách hoàn tiền và một checklist cho ba reviewer |
| Individual review | Từng reviewer tự xem xét, dùng kỹ thuật như checklist hay scenario, và ghi lại **anomaly** (điểm bất thường), đề xuất và câu hỏi | Tester ghi "chưa nói tới hoàn tiền một phần" |
| Communication và analysis | Thảo luận từng anomaly (nó không mặc nhiên là defect), quyết định trạng thái, người phụ trách và hành động; đánh giá chất lượng sản phẩm công việc | Thống nhất: hoàn tiền một phần đúng là chỗ thiếu; Product Owner sẽ bổ sung |
| Fixing và reporting | Tạo defect report cho mỗi defect, theo dõi việc sửa, chấp nhận sản phẩm khi đạt exit criteria, báo cáo kết quả | Story được cập nhật và chấp nhận; kết quả review được chia sẻ |

## Ai làm gì

| Vai trò | Trách nhiệm |
|---|---|
| Manager | Quyết định review cái gì, cung cấp người và thời gian |
| Author | Tạo ra sản phẩm công việc và sửa nó |
| Moderator (facilitator) | Điều hành buổi họp hiệu quả: hòa giải, giữ thời gian, tạo môi trường an toàn để ai cũng dám nói |
| Scribe (recorder) | Tổng hợp các anomaly, ghi lại quyết định và phát hiện mới |
| Reviewer | Thực hiện review: thành viên nhóm, chuyên gia nghiệp vụ hoặc bên liên quan khác |
| Review leader | Chịu trách nhiệm chung: ai tham gia, khi nào, ở đâu |

Trong một buổi review nhẹ, một người có thể giữ nhiều vai trò. Trong **inspection**, loại review formal nhất, author không được làm review leader hay scribe.

## Nên formal đến mức nào?

Mức độ formal tùy vào mô hình phát triển, độ trưởng thành của quy trình, sản phẩm công việc quan trọng và phức tạp đến đâu, yêu cầu pháp lý hay quy định, và có cần lưu vết để audit hay không. Cùng một tài liệu có thể được review informal trước, formal sau. Để ôn lại bốn loại review (informal review, walkthrough, technical review, inspection), xem bài trước.

## Điều gì làm review thành công

* Mục tiêu rõ ràng và exit criteria đo được. **Đánh giá người tham gia không bao giờ là mục tiêu.**
* Chọn đúng loại review cho mục tiêu, sản phẩm công việc, con người và bối cảnh.
* Chia nhỏ: reviewer mất tập trung khi phải đọc 40 trang một lúc.
* Phản hồi cho author và các bên liên quan để họ cải thiện.
* Đủ thời gian chuẩn bị.
* Sự ủng hộ của quản lý.
* Review trở thành một phần văn hóa, để học hỏi và cải tiến quy trình.
* Đào tạo, để ai cũng biết vai trò của mình.
* Buổi họp có người điều phối.

Một thất bại điển hình: bản đặc tả 60 trang gửi vào tối hôm trước buổi họp, không có checklist, và quản lý của author ngồi đếm "lỗi" của từng người. Gần như thiếu hết các yếu tố thành công.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 3.2.1 "Benefits of early and frequent stakeholder feedback", 3.2.2 "Review process activities", 3.2.3 "Roles and responsibilities in reviews", 3.2.4 "Review types" và 3.2.5 "Success factors for reviews". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus. ISO/IEC 20246 được nhắc lại theo cách syllabus trích dẫn; bản thân tiêu chuẩn không được dùng.

> Ý chính: một buổi review đi qua planning, initiation, individual review, communication và analysis, rồi fixing và reporting. Manager, author, moderator, scribe, reviewer và review leader mỗi người một phần việc, và review thành công khi có mục tiêu rõ, chia nhỏ, đủ thời gian chuẩn bị và một văn hóa đánh giá công việc, không bao giờ đánh giá con người.
