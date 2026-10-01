Giờ bạn đã biết bảy kỹ thuật. Tính năng thực tế cần kết hợp nhiều kỹ thuật, cùng với quyết định nên test sâu đến đâu. Bài này bàn về cặp ý tưởng cuối cùng bạn cần: **positive test và negative test**, và cách **chọn và kết hợp kỹ thuật** dựa trên rủi ro.

## Positive testing và negative testing

| | Positive testing | Negative testing |
|---|---|---|
| Câu hỏi | Nó có chạy đúng khi được dùng đúng cách không? | Nó có hỏng một cách an toàn khi bị dùng sai không? |
| Đầu vào | Dữ liệu hợp lệ, thao tác mong đợi | Dữ liệu không hợp lệ, thao tác bất ngờ |
| Ví dụ | Đăng nhập với email và mật khẩu đúng | Đăng nhập với mật khẩu sai, hoặc để trống email |
| Expected result | Đạt được mục tiêu | Thông báo lỗi rõ ràng, không lưu hay trừ tiền gì, không crash |

Cả hai đều cần. Positive test chứng minh tính năng mang lại giá trị; negative test chứng minh nó tự bảo vệ được chính nó và người dùng. Người mới thường chỉ viết positive test, và người dùng thật sẽ nhanh chóng tìm ra phần còn lại: gõ nhầm, bấm hai lần, thẻ hết hạn.

Các kỹ thuật tự nhiên cho bạn cả hai loại: partition không hợp lệ và giá trị nằm ngay ngoài biên là negative test, exception flow và invalid transition cũng vậy.

## Kỹ thuật nào cho vấn đề nào

| Requirement trông như thế nào | Kỹ thuật |
|---|---|
| Một field có khoảng giá trị hoặc nhóm giá trị | Equivalence partitioning + boundary value analysis |
| Nhiều điều kiện kết hợp thành các kết quả khác nhau | Decision table |
| Một trạng thái, bộ đếm hay bộ hẹn giờ làm thay đổi hành vi | State transition testing |
| Một mục tiêu của người dùng có các bước và những chỗ có thể hỏng | Use case testing |
| Requirement sơ sài, tính năng mới, hoặc điểm yếu đã biết | Error guessing + exploratory testing |

Hầu hết tính năng kết hợp nhiều dòng trong bảng. Một trang checkout có field số lượng (EP, BVA), quy tắc giảm giá (decision table), trạng thái đơn hàng (state transition), hành trình thanh toán (use case), và tiền sử defect trừ tiền hai lần (error guessing).

## Để rủi ro quyết định độ sâu

Bạn không thể test mọi thứ, nên hãy dồn công sức vào nơi mà hỏng hóc gây hại nhiều nhất. Với mỗi khu vực, hãy hỏi hai câu:

* **Mức ảnh hưởng (impact)**: hỏng thì tệ đến đâu? Tiền, dữ liệu, bảo mật, pháp lý, nhiều người dùng?
* **Khả năng xảy ra (likelihood)**: khả năng có defect cao không? Code mới, logic phức tạp, từng có nhiều bug, thay đổi làm vội?

| Rủi ro | Độ sâu |
|---|---|
| Cao (thanh toán, đăng nhập, dữ liệu cá nhân) | Nhiều kỹ thuật, BVA 3 giá trị, decision table đầy đủ, invalid transition, một session exploratory |
| Trung bình | EP + BVA 2 giá trị, decision table rút gọn, main flow và exception flow |
| Thấp (nội dung một tooltip) | Một lần kiểm tra positive nhanh, có thể gộp vào một lượt exploratory |

## Coverage: biết khi nào là đủ

Mỗi kỹ thuật đi kèm một loại coverage đo được, biến câu "tôi đã test rồi" thành một sự thật có thể báo cáo:

* **Partition coverage**: partition nào cũng có test.
* **Boundary coverage**: giá trị biên nào (2 hoặc 3 giá trị) cũng có test.
* **Decision table coverage**: rule nào cũng có test.
* **Transition coverage**: mỗi transition hợp lệ được chạy ít nhất một lần, cộng với các transition không hợp lệ bạn đã chọn.
* **Use case coverage**: main flow và mọi alternative flow, exception flow.

Coverage 100 % của một kỹ thuật không có nghĩa là tính năng không còn defect; nó có nghĩa là mô hình đó của tính năng đã được test trọn vẹn. Kết hợp nhiều kỹ thuật sẽ lấp chỗ trống của từng kỹ thuật.

## Ghép tất cả lại

Với field mới "Số khách: 1 đến 8" trên form đặt chỗ:

1. EP: hợp lệ 4; không hợp lệ 0, 9, "two".
2. BVA (2 giá trị): 0, 1, 8, 9.
3. Positive: đặt cho 1, 4 và 8 khách. Negative: 0, 9 và "two" bị từ chối kèm thông báo.
4. Error guessing: dấu cách ở đầu " 4", giá trị -1, dán chuỗi "4 guests".

Khoảng mười test, được chọn với những lý do bạn giải thích được. Đó chính là thiết kế test.

> Ý chính: test cả việc tính năng chạy đúng lẫn việc nó hỏng một cách an toàn, chọn kỹ thuật hợp với hình dạng của requirement, và để rủi ro quyết định test sâu đến đâu.
