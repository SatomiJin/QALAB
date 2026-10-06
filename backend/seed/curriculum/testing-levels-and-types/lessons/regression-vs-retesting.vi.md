Mỗi thay đổi trong code là một rủi ro mới. Một bản fix có thể chưa sửa hết, và nó có thể làm hỏng thứ hôm qua vẫn chạy tốt. Có hai loại kiểm thử trả lời cho hai rủi ro này, và chúng thường bị nhầm với nhau.

## Retesting (confirmation testing)

**Retesting**, còn gọi là **confirmation testing** (kiểm thử xác nhận), kiểm tra **một defect cụ thể đã thực sự được sửa** hay chưa. Bạn chạy lại đúng test đã fail, với cùng các bước và dữ liệu, trên build mới.

* **Khi nào:** sau khi developer đánh dấu bug là đã fix.
* **Phạm vi:** hẹp, các test case đã fail của bug đó (cộng thêm vài biến thể nhỏ xung quanh).
* **Kết quả:** bug được **close** nếu test giờ đã pass, hoặc **reopen** nếu vẫn fail.

Ví dụ: bug BUG-214 ghi "Đơn hàng 50.00 USD vẫn bị tính phí vận chuyển". Sau khi fix, bạn đặt lại một đơn 50.00 USD và kiểm tra phí vận chuyển đã miễn. Bạn cũng thử 49.99 và 50.01, vì một bản fix ở giá trị biên hay làm vấn đề dịch đi một đơn vị.

## Regression testing

**Regression testing** (kiểm thử hồi quy) kiểm tra **một thay đổi có làm hỏng những gì vốn đang chạy tốt** hay không. Một *regression* là một tính năng trước đây chạy được và giờ thì không.

* **Khi nào:** sau mọi thay đổi: một bản fix, một tính năng mới, nâng cấp thư viện, thay đổi cấu hình, môi trường mới.
* **Phạm vi:** rộng, những vùng có thể bị ảnh hưởng bởi thay đổi, dù không ai cố ý đụng vào chúng.
* **Kết quả:** bạn tìm failure **mới**, không phải bug cũ.

Ví dụ: bản fix phí vận chuyển đã sửa hàm tính tổng tiền. Regression test kiểm tra phần còn lại: mã giảm giá, thuế, file PDF hóa đơn, lịch sử đơn hàng, checkout trên mobile.

## So sánh

| | Retesting | Regression testing |
|---|---|---|
| Mục tiêu | Bug này đã được sửa chưa? | Thay đổi có làm hỏng chỗ nào khác không? |
| Test được chạy | Những test đã fail | Những test trước đây đã pass |
| Phạm vi | Hẹp, đã biết trước | Rộng, chọn theo rủi ro |
| Lên kế hoạch trước | Không, tùy bug nào được fix | Có, một regression suite được duy trì |
| Phù hợp để tự động hóa | Hiếm khi | Rất thường xuyên |

Retesting thường làm trước: chạy toàn bộ regression trên một build còn chưa sửa được chính bug mà nó được tạo ra để sửa thì chẳng có ý nghĩa gì.

## Chọn regression test

Chạy toàn bộ test sau mỗi thay đổi hiếm khi khả thi. Tester chọn regression test bằng **impact analysis** (phân tích ảnh hưởng): xác định những phần nào của hệ thống có thể bị một thay đổi tác động.

Câu hỏi khi làm impact analysis:

* Code, màn hình và API nào đã bị thay đổi?
* Cái gì **sử dụng** đoạn code đó? Một hàm dùng chung (tính giá, định dạng ngày, đăng nhập) ảnh hưởng đến mọi tính năng gọi nó.
* Dữ liệu hoặc bảng database nào đã bị thay đổi?
* Trước đây vùng này từng hỏng những gì? Defect thường tập trung theo cụm.
* Luồng nào quan trọng nhất với doanh nghiệp nếu bị hỏng (thanh toán, đăng ký, đăng nhập)?

Một cách tổ chức suite phổ biến:

* **Core regression set:** các luồng quan trọng nhất, chạy ở mọi bản release (thường được tự động hóa).
* **Targeted set:** test cho những vùng mà impact analysis chỉ ra.
* **Full regression:** toàn bộ, cho các release lớn hoặc các lần nâng cấp lớn.

Regression suite cần được bảo trì: thêm một test cho mỗi bug quan trọng đã fix (để nó không thể quay lại mà không ai biết), bỏ các test lỗi thời, và cập nhật test khi tính năng thay đổi.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 2.2.3 "Confirmation testing and regression testing" (và nguyên tắc 4, defect tập trung thành cụm, ở mục 1.3). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: retesting chứng minh *bug đã hết*; regression testing chứng minh *không có gì khác bị hỏng*. Hãy chọn regression test theo ảnh hưởng và rủi ro, không theo thói quen.
