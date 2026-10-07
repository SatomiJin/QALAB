Test automation (kiểm thử tự động) là để một chương trình chạy các phép kiểm tra thay bạn và báo pass hay fail. Nó là công cụ, không phải mục tiêu: một automated test tốn thời gian để viết, và còn tốn thêm thời gian để giữ cho nó chạy được. Một QA engineer giỏi tự động hóa ở chỗ chi phí đó được hoàn lại, và để con người làm những việc cần óc phán đoán.

## Automation là một khoản đầu tư

Mỗi automated test đều có giá:

* **Viết test**: thiết kế phép kiểm tra, tìm locator ổn định, chuẩn bị test data.
* **Bảo trì**: mỗi lần tính năng hay màn hình thay đổi, test có thể phải sửa theo.
* **Chạy và điều tra**: thời gian máy trong CI, cộng thời gian của một người khi test fail.

Nó hoàn vốn mỗi lần chạy và bắt được một **regression** (thứ trước đây chạy đúng nay bị hỏng) nhanh hơn, rẻ hơn so với người làm. Đó là **return on investment (ROI)** (lợi tức đầu tư). Cách nghĩ đơn giản:

* Một phép kiểm tra chạy mỗi năm một lần gần như không tiết kiệm được gì.
* Một phép kiểm tra chạy ở mỗi pull request, 20 lần mỗi ngày, tiết kiệm hàng giờ mỗi tuần.

## Lợi ích, rủi ro và các loại công cụ

Syllabus ISTQB tóm tắt những gì automation mang lại và những gì có thể sai:

| Lợi ích | Rủi ro |
|---|---|
| Bớt việc thủ công lặp lại (chạy regression, nhập lại dữ liệu, so sánh kết quả) | Kỳ vọng phi thực tế về khả năng của công cụ |
| Nhất quán: cùng các bước, dữ liệu và thứ tự mỗi lần chạy | Đánh giá thấp thời gian và chi phí để đưa công cụ vào và bảo trì script |
| Số đo khách quan, như coverage, mà con người không tự tính được | Dùng công cụ ở chỗ test thủ công phù hợp hơn |
| Báo cáo dễ hơn: thống kê tiến độ, tỉ lệ fail, thời gian chạy | Phụ thuộc vào công cụ mà quên tư duy phản biện |
| Phản hồi nhanh hơn, phát hiện defect sớm hơn | Phụ thuộc vào nhà cung cấp, hoặc vào một dự án mã nguồn mở có thể bị bỏ dở |
| Tester có thêm thời gian để thiết kế test mới, sâu hơn | Công cụ không hợp với nền tảng hoặc với quy định |

Automation chỉ là một loại công cụ. Tester còn dùng công cụ **quản lý test** (requirement, test, defect), công cụ **static testing** (linter, công cụ review), công cụ **thiết kế test và tạo dữ liệu**, công cụ **thực thi và đo coverage**, công cụ **non-functional** (tải, bảo mật), công cụ **DevOps** (CI/CD), công cụ **cộng tác**, và container hay máy ảo cho môi trường. Ngay cả một bảng tính cũng là công cụ test khi nó chứa test data.

## Ứng viên tốt

Nên tự động hóa những phép kiểm tra:

| Đặc điểm | Vì sao đáng làm | Ví dụ |
| --- | --- | --- |
| **Lặp lại** | Chạy nhiều lần nên chi phí được chia đều | Login, sign-up, checkout trong mỗi lượt regression |
| **Ổn định** | Tính năng và màn hình ít thay đổi nên ít phải bảo trì | Quy tắc tính thuế không đổi suốt hai năm |
| **Rủi ro cao** | Lỗi gây mất tiền hoặc mất uy tín, nên cần kiểm tra ở mọi thay đổi | Số tiền thanh toán, đặt lại mật khẩu, phân quyền |
| **Nhiều dữ liệu** | Nhiều input, cùng các bước: máy không biết chán | 50 tổ hợp quốc gia và tiền tệ cho phí vận chuyển |
| **Khó làm bằng tay** | Thao tác chính xác hoặc nhanh mà người không làm ổn định được | 200 lời gọi API song song, kiểm tra từng field của JSON response |

**Smoke test** (bộ test ngắn chứng minh các luồng chính chạy được) và **regression suite** là mục tiêu kinh điển để tự động hóa đầu tiên.

## Ứng viên kém

Nên giữ thủ công, ít nhất là lúc này:

| Loại kiểm thử | Vì sao automation không phù hợp |
| --- | --- |
| **Exploratory testing** | Giá trị của nó là một người suy nghĩ, để ý và lần theo linh cảm. Script chỉ kiểm tra điều nó được bảo kiểm tra. |
| **Usability và giao diện** | "Chỗ này có gây khó hiểu không?" hay "Có cảm giác chậm không?" cần con người. Script kiểm tra được nút có tồn tại, không kiểm tra được người dùng có tìm thấy nó không. |
| **Kiểm tra một lần** | Một lần migrate dữ liệu được kiểm tra một lần: viết script tốn hơn làm tay. |
| **Tính năng thay đổi mỗi tuần** | Màn hình mới còn đang thiết kế lại sẽ làm vỡ test mỗi sprint. Hãy đợi nó ổn định. |
| **Không có expected result rõ ràng** | Nếu bạn không viết được thế nào là pass hay fail, máy cũng không quyết định được. |

Không tự động hóa một thứ là một quyết định, không phải thất bại. Hãy ghi lại lý do, và xem lại khi tình hình thay đổi (tính năng đã ổn định, phép kiểm tra bắt đầu phải chạy hằng tuần).

## Checklist ra quyết định nhanh

Trước khi tự động hóa một phép kiểm tra, hãy hỏi:

1. Nó sẽ chạy bao lâu một lần? (Mỗi pull request, mỗi release, hay một lần?)
2. Tính năng có khả năng thay đổi trong vài tháng tới không?
3. Bỏ sót bug ở đây thì thiệt hại bao nhiêu?
4. Expected result có nêu được chính xác không?
5. Có tầng nào rẻ hơn để kiểm tra không? (API test hoặc unit test thay vì UI test, xem bài tiếp theo.)

Một phép kiểm tra chạy thường xuyên, ít thay đổi, bảo vệ thứ quan trọng và có expected result chính xác là ứng viên mạnh.

## Sai lầm thường gặp

* **"Tự động hóa 100 %."** Có những kiểm thử không thể tự động hóa, và chạy theo con số sẽ sinh ra những test mong manh mà không ai tin.
* **Chuyển test case thủ công sang script y nguyên.** Test case viết cho người thường dài và trộn nhiều phép kiểm tra. Hãy tách và thiết kế lại cho máy.
* **Tự động hóa một quy trình hỏng.** Nếu không ai xem kết quả, automation chỉ tạo ra những báo cáo màu đỏ.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), chương 6 "Test tools" (6.1 công cụ hỗ trợ kiểm thử, 6.2 lợi ích và rủi ro của test automation) và nguyên tắc 5 ở mục 1.3 (test bị "nhờn"). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: tự động hóa những gì lặp lại, ổn định, rủi ro cao và kiểm tra được chính xác; để exploratory testing, usability và các kiểm tra một lần cho con người.
