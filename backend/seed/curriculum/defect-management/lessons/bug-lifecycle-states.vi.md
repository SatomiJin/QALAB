Từ lúc bạn báo cho đến khi được đóng, một bug đi qua một chuỗi **trạng thái** (state). Trạng thái cho mọi người biết ai phải hành động tiếp theo: tester, lead hay developer. Các công cụ như Jira, Azure DevOps hay YouTrack đặt tên trạng thái hơi khác nhau, nhưng luồng gần như luôn là luồng dưới đây.

## Các trạng thái

| Trạng thái | Ý nghĩa | Ai hành động tiếp |
|---|---|---|
| New | Vừa được báo, chưa ai xem xét | Test lead / triage |
| Assigned | Được chấp nhận là bug thật và giao cho một developer | Developer |
| In Progress | Developer đang sửa | Developer |
| Fixed | Developer đã sửa code; bản sửa đang chờ vào build | Developer / build |
| Retest | Bản sửa đã có trong build mà tester dùng được | Tester |
| Verified | Tester xác nhận failure đã hết | Tester / lead |
| Closed | Không còn việc gì phải làm | Không ai |
| Reopened | Bản sửa không hiệu quả, hoặc bug quay lại | Developer |

## Các bước chuyển trạng thái

Vòng đời là một sơ đồ trạng thái: mỗi mũi tên là một bước chuyển được phép, do một vai trò cụ thể thực hiện.

| Từ | Sang | Khi nào | Do ai |
|---|---|---|---|
| New | Assigned | Bug hợp lệ và có người phụ trách | Lead / triage |
| Assigned | In Progress | Developer bắt đầu xử lý | Developer |
| In Progress | Fixed | Thay đổi code đã xong và được merge | Developer |
| Fixed | Retest | Bản sửa đã được deploy lên môi trường test | Developer / release |
| Retest | Verified | Các bước ban đầu pass và các kiểm tra xung quanh cũng pass | Tester |
| Retest | Reopened | Failure vẫn còn | Tester |
| Verified | Closed | Bản sửa được chấp nhận (thường là khi đã release) | Tester / lead |
| Closed | Reopened | Đúng failure đó quay lại về sau | Tester |
| Reopened | Assigned | Bug được giao lại cho một developer | Lead |

Đọc thành một đường đi, luồng suôn sẻ là **New → Assigned → In Progress → Fixed → Retest → Verified → Closed**. Reopened đưa bug quay lại vòng lặp.

Một số team gộp trạng thái (Fixed và Retest thường là một cột, "Ready for QA"), và nhiều team thêm các kết cục của triage: Rejected, Duplicate, Cannot Reproduce, Won't Fix, Deferred. Đó là nội dung của bài sau.

## Phần việc của tester

Tester nắm ba thời điểm trong vòng đời:

1. **New**: chất lượng của report quyết định bug được xử lý nhanh đến đâu.
2. **Retest**: bạn chạy lại các bước ban đầu **trên build có chứa bản sửa**, kiểm tra số build có khớp không, và chạy thêm vài test quanh chỗ thay đổi, vì một bản sửa có thể làm hỏng thứ gì đó gần đó (đó là **regression testing**).
3. **Verified / Reopened**: bạn là người quyết định. Nếu failure đã hết, hãy verify. Nếu vẫn còn, hãy reopen kèm comment ghi rõ bạn đã dùng build nào và thấy gì.

## Reopen hay tạo bug mới?

Reopen khi **đúng failure đó** với đúng các bước vẫn còn, hoặc quay trở lại. Báo **bug mới** khi bản sửa đã đúng nhưng bạn tìm ra một vấn đề khác, kể cả ở cùng khu vực: "giảm giá giờ đã đúng, nhưng tổng tiền không còn tính phí giao hàng" là một bug mới, liên kết với bug cũ. Reopen một bug cho một vấn đề khác sẽ giấu vấn đề đó trong lịch sử của bug cũ.

## Vì sao trạng thái quan trọng

Trạng thái làm cho công việc hiện rõ. Một dashboard có thể cho thấy bao nhiêu bug đang chờ developer, bao nhiêu đang chờ retest, và mỗi bước mất bao lâu. Một bug nằm ở Retest suốt hai tuần nghĩa là tester đang là điểm nghẽn; một bug bị reopen ba lần nghĩa là các bản sửa chưa được kiểm tra kỹ trước khi chuyển lại.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 5.5 "Defect management" (một workflow từ lúc phát hiện đến lúc đóng). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus.
* Tên các trạng thái theo quy ước phổ biến của các công cụ; mỗi nhóm và mỗi công cụ (Jira, Azure DevOps, YouTrack) tự cấu hình workflow riêng. Phần giải thích do team QALAB tự biên soạn.

> Ý chính: trạng thái của bug cho biết ai hành động tiếp theo. Tester báo bug (New), test lại bản sửa (Retest) rồi verify hoặc reopen, dựa trên build có chứa bản sửa.
