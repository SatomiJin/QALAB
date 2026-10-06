Bạn sẽ không bao giờ có đủ thời gian để test mọi thứ (không thể kiểm thử toàn bộ), nên test plan nào cũng ngầm trả lời một câu hỏi: *hỏng ở đâu thì đau nhất?* **Risk-based testing** (kiểm thử dựa trên rủi ro) trả lời câu hỏi đó một cách công khai. Các hoạt động kiểm thử được chọn, ưu tiên và quản lý dựa trên phân tích rủi ro, để công sức dồn vào nơi giảm được nhiều rủi ro nhất.

## Rủi ro là gì

**Rủi ro** (risk) là một sự kiện hay tình huống có thể xảy ra và gây hại nếu nó xảy ra. Nó có hai thuộc tính:

* **Likelihood** (khả năng xảy ra): xác suất xảy ra (lớn hơn 0, nhỏ hơn 1).
* **Impact** (mức ảnh hưởng): hậu quả tệ đến mức nào.

Kết hợp lại, chúng cho ra **risk level** (mức rủi ro). Mức càng cao thì càng phải xử lý sớm và kỹ.

## Project risk và product risk

| | Project risk | Product risk |
|---|---|---|
| Liên quan đến | Việc quản lý và vận hành dự án | Chất lượng của sản phẩm |
| Ví dụ | Môi trường test đến trễ; ước lượng quá lạc quan; tester duy nhất hiểu phần thanh toán đi nghỉ phép; nhà cung cấp giao hàng trễ; phạm vi cứ phình ra | Tính sai giảm giá; crash ở checkout; tìm kiếm chậm; lỗ hổng bảo mật ở đăng nhập; luồng đăng ký khó hiểu |
| Nếu xảy ra | Lịch, ngân sách hoặc phạm vi bị ảnh hưởng | Người dùng không hài lòng, mất doanh thu và uy tín, tốn chi phí hỗ trợ, bị phạt theo luật, trường hợp xấu nhất gây hại về thể chất |
| Do ai xử lý | Quản lý dự án (tester có trách nhiệm nêu ra) | Kiểm thử, cùng các biện pháp khác |

Tester theo dõi cả hai, nhưng risk-based testing chủ yếu nói về **product risk**.

## Phân tích product risk

Bắt đầu sớm, tốt nhất là ngay khi requirement đang được viết.

1. **Risk identification** (nhận diện rủi ro): cùng các bên liên quan liệt kê rủi ro, bằng brainstorming, workshop, phỏng vấn hoặc sơ đồ nhân quả.
2. **Risk assessment** (đánh giá rủi ro): phân loại từng rủi ro, chấm khả năng xảy ra và mức ảnh hưởng, tính mức rủi ro, sắp thứ tự ưu tiên, và đề xuất cách xử lý.

Việc đánh giá có thể **định lượng** (mức = khả năng × ảnh hưởng) hoặc **định tính**, dùng một **risk matrix** (ma trận rủi ro):

| Khả năng \ Ảnh hưởng | Thấp | Trung bình | Cao |
|---|---|---|---|
| **Cao** | Trung bình | Cao | Cao |
| **Trung bình** | Thấp | Trung bình | Cao |
| **Thấp** | Thấp | Thấp | Trung bình |

Ví dụ cho một bản release của cửa hàng:

| Rủi ro | Khả năng | Ảnh hưởng | Mức |
|---|---|---|---|
| Giảm giá bị trừ hai lần vào tổng tiền | Trung bình (code mới) | Cao (mất tiền ở mọi đơn) | Cao |
| Email xác nhận đơn hàng đến chậm | Trung bình | Trung bình | Trung bình |
| Link ở footer tới blog cũ bị hỏng | Cao | Thấp | Trung bình |
| Ảnh sản phẩm tải chậm trên 3G | Thấp | Trung bình | Thấp |

## Phân tích rủi ro định hình việc kiểm thử ra sao

Kết quả phân tích product risk quyết định:

* **phạm vi** kiểm thử, và dùng những **cấp độ test**, **loại test** nào,
* áp dụng **kỹ thuật test** nào và cần đạt **coverage** bao nhiêu (BVA 3 giá trị và decision table đầy đủ cho quy tắc giảm giá; kiểm tra nhanh cho footer),
* **công sức** cần ước lượng cho từng việc,
* **thứ tự ưu tiên**: test rủi ro cao nhất trước, để tìm defect nghiêm trọng sớm nhất có thể,
* có nên dùng thêm biện pháp **ngoài kiểm thử** để giảm rủi ro không (code review, feature flag, monitoring).

## Risk control

**Risk control** (kiểm soát rủi ro) gồm hai phần: **risk mitigation** (thực hiện các hành động đã lên kế hoạch để hạ mức rủi ro) và **risk monitoring** (kiểm tra các hành động đó có hiệu quả không, tinh chỉnh việc đánh giá, và phát hiện rủi ro mới). Không phải rủi ro nào cũng được giảm bằng kiểm thử; nhóm cũng có thể **chấp nhận** rủi ro, **chuyển giao** nó (cho nhà cung cấp hay bên bảo hiểm), hoặc chuẩn bị **phương án dự phòng**.

Khi kiểm thử là biện pháp giảm rủi ro, các lựa chọn gồm:

* tester có kinh nghiệm phù hợp với loại rủi ro,
* mức **độc lập** của kiểm thử phù hợp,
* **review** và **static analysis**,
* **kỹ thuật test** và **mức coverage** phù hợp,
* **loại test** nhắm vào đặc tính chất lượng bị ảnh hưởng (ví dụ performance test cho tìm kiếm chậm),
* **dynamic testing**, gồm cả **regression testing**.

Risk register là tài liệu sống: sau mỗi vòng test, cập nhật các mức rủi ro bằng những gì đã biết thêm. Một rủi ro mà mọi test đều pass sẽ có **residual risk** (rủi ro còn lại) thấp hơn; một cụm defect mới sẽ đẩy nó lên.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 5.2 "Risk management" (5.2.1–5.2.4). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus. Ma trận rủi ro 3×3 là ví dụ phổ biến, không lấy từ syllabus.

> Ý chính: rủi ro = khả năng xảy ra × mức ảnh hưởng. Project risk đe dọa lịch, ngân sách và phạm vi; product risk đe dọa chất lượng. Phân tích product risk quyết định phạm vi, kỹ thuật, coverage, công sức và thứ tự kiểm thử, còn risk control giảm và theo dõi rủi ro, bằng kiểm thử và bằng các biện pháp khác.
