**Software Testing Life Cycle (STLC)** là chuỗi hoạt động tester thực hiện cho một bản release. Nó chạy song song với vòng đời phát triển (SDLC), không phải chạy sau.

## Các giai đoạn

| Giai đoạn | Câu hỏi chính | Đầu ra |
|---|---|---|
| Phân tích requirement | Cần test những gì? | Requirement có thể test được, các câu hỏi |
| Lập kế hoạch test | Test thế nào, ai làm, khi nào? | Test plan: phạm vi, cách tiếp cận, rủi ro, lịch |
| Thiết kế test | Những case nào, dữ liệu nào? | Test case, test data |
| Chuẩn bị môi trường | Chạy ở đâu? | Môi trường test sẵn sàng |
| Thực thi test | Nó có hoạt động như mong đợi không? | Kết quả (Pass, Fail, Blocked), bug report |
| Kết thúc test | Đã xong chưa, rút ra được gì? | Test summary report |

## Entry criteria và exit criteria

Mỗi giai đoạn có **entry criteria** (điều kiện phải đúng để bắt đầu) và **exit criteria** (điều kiện phải đúng để kết thúc). Ví dụ: có thể bắt đầu thực thi khi build đã được deploy và smoke test pass; có thể kết thúc khi mọi case ưu tiên cao đã chạy và không còn bug critical nào mở.

## Verdict

Trong lúc thực thi, mỗi test case nhận một verdict:

* **Pass**: kết quả thực tế khớp với kết quả mong đợi.
* **Fail**: không khớp; viết bug report.
* **Blocked**: không chạy được case này (ví dụ, một bug ở màn đăng nhập chặn mọi thứ phía sau).
* **Not run**: chưa được thực thi.

Ứng dụng này dùng chính các verdict đó cho tiến độ học của bạn.
