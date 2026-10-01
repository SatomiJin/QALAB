Không phải bug nào cũng kết thúc bằng một bản sửa. Có bug hoá ra không phải bug, có bug đã được báo rồi, có bug không tái hiện được, và có bug là thật nhưng sẽ không được sửa lúc này. Những kết cục này là bình thường; điều quan trọng là mỗi kết cục đều được quyết định có chủ đích, có lý do ghi trong report, và tester biết mình cần làm gì tiếp theo.

## Triage

**Triage** (phân loại bug) là việc xem xét định kỳ các bug mới, thường là một cuộc họp ngắn (hằng ngày khi gần release, hằng tuần vào lúc khác) giữa test lead, developer lead và product owner. Với mỗi bug New, họ quyết định:

1. Nó có hợp lệ không? Có bị trùng không?
2. Severity: tester đánh giá có đúng không?
3. Priority: với kinh doanh, nó gấp đến mức nào?
4. Ai sửa, và sửa trong bản release nào?

Tester tham gia để giải thích bug của mình và trả lời câu hỏi. Một report rõ ràng giúp triage chỉ mất vài giây; một report mơ hồ sẽ bị trả lại với "cần thêm thông tin".

## Các kết cục khác

| Kết cục | Khi nào áp dụng | Tester làm gì tiếp |
|---|---|---|
| Rejected (Not a Bug) | Hành vi là đúng: khớp với requirement, hoặc test bị sai (sai dữ liệu, sai môi trường) | Kiểm tra lại requirement. Nếu đồng ý, chấp nhận và sửa test của mình. Nếu chính requirement có vẻ sai, hãy nêu với product owner |
| Duplicate | Đúng failure đó đã được báo rồi | Kiểm tra xem có thật là cùng failure không; bổ sung thông tin mới vào bug gốc và theo dõi bug đó |
| Cannot Reproduce | Developer làm theo các bước mà không thấy failure | Thử lại trên build mới nhất, so sánh môi trường, bổ sung chi tiết còn thiếu, log hoặc video; reopen kèm những thứ đó, hoặc đóng nếu chính bạn cũng không tái hiện được |
| Won't Fix | Đây là bug thật, nhưng chi phí hoặc rủi ro khi sửa cao hơn mức ảnh hưởng (trình duyệt cũ, tính năng sắp bị gỡ) | Đảm bảo quyết định và lý do được ghi lại; nêu nó như một known issue nếu người dùng có thể gặp |
| Deferred | Đây là bug thật, sẽ sửa sau: không phải trong bản release này | Kiểm tra bug có bản release mục tiêu; retest khi bản release đó được test |

**Rejected và Cannot Reproduce không phải lời chê.** Chúng là câu hỏi gửi lại bạn: "cho tôi xem". Hãy trả lời bằng sự thật, không bằng sự bực bội. **Won't Fix và Deferred là quyết định kinh doanh:** việc của tester là đảm bảo mức ảnh hưởng được hiểu rõ khi ra quyết định, không phải là thắng cuộc tranh luận.

## Nhìn kỹ hơn vào Cannot Reproduce

Đây là kết cục hay cần phản hồi nhất, nên hãy làm có hệ thống:

* **Cùng build không?** Bug có thể đã được sửa, hoặc developer đang chạy code cũ hơn.
* **Cùng môi trường không?** Trình duyệt, thiết bị, hệ điều hành, kích thước màn hình, ngôn ngữ, múi giờ, mạng.
* **Cùng dữ liệu không?** Một tài khoản cụ thể, một sản phẩm có giảm giá, giỏ hàng trống, tên có dấu.
* **Cùng thời điểm không?** Bấm hai lần liên tiếp, mạng chậm, mở hai tab, session đã hết hạn.

Sau đó cập nhật report với những gì bạn tìm ra, kèm video và log, rồi gửi lại. Nếu chính bạn cũng không tái hiện được nữa, hãy nói thật và đóng bug; giữ lại bằng chứng phòng khi nó quay lại.

## Defect metrics

Các team theo dõi bug bằng vài con số. Chúng cho thấy xu hướng; chúng không phải điểm số để chấm con người.

| Metric | Cho thấy điều gì |
|---|---|
| Số bug đang mở theo severity và priority | Sản phẩm đã sẵn sàng release chưa? Một bug critical còn mở thường chặn release |
| Số bug tìm thấy so với số bug được sửa mỗi tuần | Ta tìm bug nhanh hơn tốc độ sửa không? |
| Reopen rate (tỷ lệ mở lại) | Bao nhiêu bản sửa không đúng ngay lần đầu |
| Rejection rate (tỷ lệ bị từ chối) | Bao nhiêu report không phải bug: có thể do requirement hoặc report chưa rõ |
| Defect leakage (lọt lỗi) | Bug tìm thấy trên production mà quá trình test đã bỏ sót |
| Thời gian sửa trung bình | Một bug phải chờ bao lâu, theo từng priority |

Nếu report của chính bạn có tỷ lệ bị từ chối cao, đó là tín hiệu cần đọc requirement kỹ hơn; tỷ lệ reopen cao là tín hiệu developer cần tự test bản sửa trước khi chuyển lại.

> Ý chính: mọi bug đều kết thúc bằng một quyết định, không phải lúc nào cũng là bản sửa. Triage quyết định tính hợp lệ, severity, priority và người phụ trách; tester trả lời Rejected và Cannot Reproduce bằng sự thật, và đảm bảo Won't Fix và Deferred được quyết định khi đã nhìn rõ mức ảnh hưởng.
