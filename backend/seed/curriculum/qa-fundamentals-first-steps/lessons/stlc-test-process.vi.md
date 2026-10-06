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

## Cùng quy trình đó theo thuật ngữ ISTQB

Tên các giai đoạn ở trên là cách gọi phổ biến trong công ty. Syllabus ISTQB mô tả cùng công việc đó thành bảy nhóm **test activity** (hoạt động kiểm thử), thường chồng lên nhau hoặc lặp lại trong mỗi iteration chứ không chạy lần lượt cứng nhắc:

| Hoạt động ISTQB | Trả lời câu hỏi | Đầu ra điển hình (testware) |
|---|---|---|
| Test planning | Mục tiêu và cách tiếp cận là gì? | Test plan, lịch, risk register, entry và exit criteria |
| Test monitoring và control | Có đúng tiến độ không, cần điều chỉnh gì? | Báo cáo tiến độ, quyết định điều chỉnh |
| Test analysis | Test **cái gì**? | Test condition đã ưu tiên, defect tìm thấy trong requirement |
| Test design | Test **thế nào**? | Test case, test charter, yêu cầu về test data và môi trường |
| Test implementation | Mọi thứ đã sẵn sàng để chạy chưa? | Test procedure, script, test suite, test data, lịch thực thi, môi trường |
| Test execution | Nó có hoạt động như mong đợi không? | Test log, defect report |
| Test completion | Rút ra được gì, bàn giao gì? | Test completion report, bài học kinh nghiệm, testware được lưu trữ |

Mỗi hoạt động làm nhiều hay ít tùy bối cảnh: một ngân hàng chịu quản lý chặt sẽ ghi chép đầy đủ, một nhóm Agile nhỏ có thể giữ phần lớn trong backlog và CI pipeline.

## Entry criteria và exit criteria

Mỗi giai đoạn có **entry criteria** (điều kiện phải đúng để bắt đầu) và **exit criteria** (điều kiện phải đúng để kết thúc). Ví dụ: có thể bắt đầu thực thi khi build đã được deploy và smoke test pass; có thể kết thúc khi mọi case ưu tiên cao đã chạy và không còn bug critical nào mở.

## Verdict

Trong lúc thực thi, mỗi test case nhận một verdict:

* **Pass**: kết quả thực tế khớp với kết quả mong đợi.
* **Fail**: không khớp; viết bug report.
* **Blocked**: không chạy được case này (ví dụ, một bug ở màn đăng nhập chặn mọi thứ phía sau).
* **Not run**: chưa được thực thi.

Ứng dụng này dùng chính các verdict đó cho tiến độ học của bạn.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.4.1 "Test activities and tasks", 1.4.2 "Test process in context" và 1.4.3 "Testware". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Các giai đoạn STLC kiểu công ty là cách làm phổ biến trong ngành, không phải thuật ngữ ISTQB; phần giải thích do team QALAB tự biên soạn.
