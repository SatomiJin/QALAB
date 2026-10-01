Thực thi là lúc kế hoạch gặp sản phẩm thật. Những gì bạn ghi lại khi chạy test trở thành bằng chứng cho câu hỏi quan trọng nhất của một release: **có phát hành được không?** Bài này nói về cách ghi kết quả một cách trung thực, những con số cần báo cáo, và cách biến chúng thành test summary report với khuyến nghị go/no-go rõ ràng.

## Verdict trong thực tế

| Verdict | Dùng khi | Ghi lại |
|---|---|---|
| Pass | Kết quả thực tế khớp với kết quả mong đợi | Ngày, build, tester; bằng chứng cho các case quan trọng |
| Fail | Kết quả thực tế khác kết quả mong đợi | Kết quả thực tế và link tới bug report |
| Blocked | Không chạy được case vì một nguyên nhân bên ngoài nó | Cái gì đang chặn (một bug, thiếu môi trường, thiếu dữ liệu) |
| Not run | Case đã có trong kế hoạch nhưng chưa được thực thi | Lý do, nếu nó sẽ không được chạy (bị bỏ khỏi phạm vi, hết thời gian) |

Hai quy tắc giúp verdict đáng tin. Thứ nhất, một case là **Blocked**, không phải Fail, khi nó không thể đi tới điểm kiểm tra của chính nó: nếu bug ở màn đăng nhập khiến bạn không vào được checkout, các case checkout bị Blocked bởi bug đó, và chỉ case đăng nhập là Fail. Thứ hai, verdict gắn với một **build**: khi có bản sửa, case đã fail được chạy lại trên build mới (**retest**), và các case lân cận cũng được chạy lại để chắc rằng bản sửa không làm hỏng gì khác (**regression**). Verdict cũ vẫn được giữ trong lịch sử.

## Execution log

Mỗi lần chạy đều được ghi lại, để ai cũng thấy được cái gì đã được test, trên build nào, và do ai.

| Test case | Build | Ngày | Tester | Verdict | Ghi chú |
|---|---|---|---|---|---|
| TC-CHK-010 | 2.4.0-rc1 | 10/3 | Anna | Fail | Tổng 46.00 USD, mong đợi 45.00 USD; BUG-201 |
| TC-CHK-011 | 2.4.0-rc1 | 10/3 | Anna | Pass | |
| TC-PAY-003 | 2.4.0-rc1 | 10/3 | Ben | Blocked | Sandbox thanh toán không hoạt động |
| TC-CHK-010 | 2.4.0-rc2 | 12/3 | Anna | Pass | Retest BUG-201 |

## Các chỉ số

| Chỉ số | Công thức | Cho biết |
|---|---|---|
| Execution progress (tiến độ thực thi) | (Pass + Fail) ÷ số case trong kế hoạch | Bao nhiêu phần của kế hoạch thật sự đã chạy |
| Pass rate (tỷ lệ pass) | Pass ÷ (Pass + Fail) | Bao nhiêu phần trong số đã chạy là hoạt động đúng |
| Blocked / not run | số lượng | Những gì bạn chưa kiểm tra được, và vì sao |
| Defect theo severity | đang mở và đã sửa, theo từng mức severity | Các vấn đề còn lại nghiêm trọng đến đâu |

Trong khóa học này, một case được tính là **đã thực thi** khi nó có verdict Pass hoặc Fail; case Blocked và Not run là chưa được thực thi. Ví dụ: 120 case trong kế hoạch, 90 Pass, 10 Fail, 8 Blocked, 12 Not run. Số đã thực thi = 100, execution progress = 100 ÷ 120 ≈ 83 %, pass rate = 90 ÷ 100 = 90 %.

Không một con số nào là đủ. Pass rate 98 % mà còn một defect critical đang mở ở phần thanh toán thì tệ hơn 90 % mà chỉ còn vài bug giao diện minor. Và pass rate cao trên một nửa kế hoạch sẽ che mất mọi thứ ở nửa còn lại. Luôn đọc pass rate cùng với execution progress và **defect đang mở theo severity**.

## Test summary report

Được viết khi kết thúc một vòng test, dành cho những người sẽ không đọc test case: product owner, release manager, developer.

| Mục | Nội dung |
|---|---|
| Scope | Đã test những gì, trên build và môi trường nào, và những gì không test |
| Kết quả | Số trong kế hoạch, đã thực thi, Pass, Fail, Blocked, Not run, pass rate |
| Defect | Defect đang mở và đã sửa theo severity, nêu tên những defect quan trọng |
| Exit criteria | Từng tiêu chí trong test plan: đạt hay chưa đạt |
| Rủi ro | Những gì còn chưa được test hoặc chưa chắc chắn, và cái giá có thể phải trả |
| Khuyến nghị | Go, no-go hoặc go có điều kiện, kèm lý do |

## Ví dụ summary report

| Mục | Release 2.4 (build 2.4.0-rc2, staging) |
|---|---|
| Scope | Mã giảm giá và checkout trên web; mobile ngoài phạm vi |
| Kết quả | 120 trong kế hoạch, 110 đã thực thi: 106 Pass, 4 Fail; 6 Blocked, 4 Not run; pass rate 96 % |
| Defect | 0 critical, 0 major đang mở; 3 minor đang mở (bố cục); 12 đã sửa và đã retest |
| Exit criteria | Mọi case ưu tiên cao đã chạy: đạt. Pass rate ≥ 95 %: đạt. Không còn critical hay major mở: đạt |
| Rủi ro | 6 case thanh toán bị blocked do sandbox ngừng hoạt động; đã được bao phủ bằng API test với provider giả lập (mock) |
| Khuyến nghị | **Go**, với 3 bug minor đưa vào kế hoạch của 2.4.1 và 6 case bị blocked được chạy trong smoke test trên production sau khi release |

## Khuyến nghị go/no-go

QA đưa ra **khuyến nghị** dựa trên bằng chứng; quyết định release thuộc về product owner hoặc release manager, những người còn cân nhắc cả lý do kinh doanh. Một khuyến nghị tốt:

* so sánh kết quả với **exit criteria** trong test plan;
* nêu tên các defect đang mở quan trọng theo severity, không chỉ đưa ra một con số;
* nói rõ **rủi ro** của những gì chưa được test (blocked, not run, ngoài phạm vi);
* nói rõ *go*, *no-go*, hoặc *go có điều kiện*, và điều gì sẽ làm thay đổi nó ("no-go cho đến khi BUG-230 được sửa và retest").

> Ý chính: ghi verdict theo build cho mọi lần chạy, báo cáo pass rate cùng với execution progress và defect đang mở theo severity, đối chiếu exit criteria, và kết thúc summary report bằng một khuyến nghị go/no-go rõ ràng kèm lý do.
