Trước khi ai đó viết test case, cả team cần thống nhất sẽ test cái gì, test thế nào, ai làm, khi nào, và thế nào thì được coi là "xong". Thỏa thuận đó được ghi lại trong hai tài liệu: **test strategy** (chiến lược kiểm thử) và **test plan** (kế hoạch kiểm thử). Một test plan tốt gói gọn trong một trang và giúp tránh nhiều ngày tranh cãi về sau.

## Test strategy và test plan khác nhau thế nào

| | Test strategy | Test plan |
|---|---|---|
| Câu hỏi | Nói chung, chúng ta test thế nào? | Test bản release hoặc tính năng *này* thế nào? |
| Vòng đời | Dùng lâu dài, ít thay đổi | Mỗi release, dự án hoặc tính năng lớn có một bản |
| Người phụ trách | QA lead, cho cả sản phẩm hoặc công ty | Test lead hoặc tester của tính năng |
| Ví dụ nội dung | "Regression được tự động hóa ở mức API; release nào cũng có smoke test" | "Mã giảm giá của release 2.4 do Anna và Ben test từ 3 đến 14/3" |

Strategy đặt ra quy tắc; plan áp dụng quy tắc đó vào một phần việc cụ thể. Ở team nhỏ, strategy có thể chỉ là một đoạn ngắn ở đầu test plan.

## Test plan gồm những gì

| Mục | Trả lời câu hỏi | Ví dụ |
|---|---|---|
| Scope (phạm vi) | Sẽ test những gì | Áp mã giảm giá ở trang checkout trên web |
| Out of scope (ngoài phạm vi) | Cố ý *không* test những gì, và vì sao | Mobile app (quý sau mới phát hành) |
| Approach (cách tiếp cận) | Test level, loại test và kỹ thuật | Functional test với boundary value, API test cho các quy tắc, một buổi exploratory testing trên UI |
| Entry criteria | Điều gì phải đúng để bắt đầu | Build đã lên staging, smoke test pass, quy tắc đã được duyệt |
| Exit criteria | Điều gì phải đúng để kết thúc | Mọi case ưu tiên cao đã chạy, không còn bug critical hay major nào mở |
| Risks (rủi ro) | Điều gì có thể hỏng, và phương án dự phòng | Sandbox thanh toán không chạy → dùng mock cho provider |
| Resources (nguồn lực) | Người, môi trường, công cụ, test data | 2 tester, staging, 20 tài khoản test |
| Schedule (lịch) | Mỗi hoạt động diễn ra khi nào | Thiết kế 3–5/3, thực thi 6–12/3 |
| Deliverables (sản phẩm bàn giao) | QA bàn giao những gì | Test case, bug report, test summary report |

## Scope và out of scope

Ghi rõ **out of scope** quan trọng không kém ghi scope. Câu "Chúng tôi không test mobile app" bảo vệ cả team: nếu xuất hiện bug trên mobile, mọi người đã đồng ý từ trước rằng phần đó không được bao phủ. Luôn ghi lý do (team khác phụ trách, chưa phát hành, rủi ro đã được chấp nhận) để quyết định đó có thể được xem xét lại.

## Entry criteria và exit criteria kiểm tra được

Tiêu chí chỉ có ích khi ai cũng trả lời được là "đạt" hay "chưa đạt".

| Mơ hồ | Kiểm tra được |
|---|---|
| Build ổn định | Bộ smoke test pass trên staging |
| Test đã xong | 100 % case ưu tiên cao đã được thực thi |
| Chất lượng đủ tốt | Không còn defect critical hoặc major nào mở, pass rate ≥ 95 % |

Exit criteria không phải lời hứa sẽ không còn bug nào (test toàn bộ là không thể). Nó là điểm mà cả team đã thống nhất rằng có đủ thông tin để ra quyết định.

## Rủi ro quyết định cách tiếp cận

Liệt kê các rủi ro, đánh giá mỗi rủi ro theo **khả năng xảy ra** (likelihood) và **mức ảnh hưởng** (impact), rồi dồn nhiều công sức nhất vào chỗ cả hai đều cao. Mã giảm giá tính sai tổng tiền làm mất tiền trên mọi đơn hàng, nên nó được test bằng boundary value và API test. Lỗi chính tả trong tooltip chỉ cần xem qua. Mỗi rủi ro còn có **mitigation** (biện pháp giảm thiểu): team làm gì để giảm rủi ro, hoặc xoay xở thế nào nếu nó xảy ra.

## Ví dụ test plan một trang

| Mục | Release 2.4: mã giảm giá |
|---|---|
| Scope | Áp, gỡ và kết hợp mã ở checkout trên web; tính tổng tiền và thuế |
| Out of scope | Mobile app (quý sau); hiệu năng của payment provider (theo SLA của provider) |
| Approach | Equivalence partitioning và boundary value cho quy tắc mã; API test cho tổng tiền; một buổi exploratory testing |
| Entry | Build 2.4.0 trên staging, bộ smoke test pass, quy tắc đã được product owner duyệt |
| Exit | Mọi case ưu tiên cao đã chạy; không còn defect critical hoặc major mở; đã gửi summary report |
| Risks | Sandbox ngừng hoạt động → dùng mock; chỉ một tester hiểu checkout → test theo cặp |
| Resources | Anna, Ben; staging; 20 tài khoản; mã SAVE10, SAVE15, EXPIRED01 |
| Schedule | Thiết kế 3–5/3; thực thi 6–12/3; báo cáo 13/3 |

Test plan là tài liệu sống: khi scope hoặc lịch thay đổi, hãy cập nhật nó và báo cho cả team.

> Ý chính: test strategy là cách test chung của một team; test plan áp dụng nó cho một release, với scope và out of scope rõ ràng, entry và exit criteria kiểm tra được, và các rủi ro quyết định công sức được dồn vào đâu.
