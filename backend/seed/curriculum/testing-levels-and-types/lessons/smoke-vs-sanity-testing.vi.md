Trước khi dành cả ngày để test một build mới, bạn muốn biết build đó có đáng để test hay không. Smoke testing và sanity testing là hai kiểm tra nhanh trả lời câu hỏi đó theo hai cách khác nhau. Các đội dùng hai từ này khá tùy tiện, nên hãy hiểu ý tưởng đằng sau mỗi từ và hỏi xem đội của bạn hiểu chúng thế nào.

## Smoke testing

Cái tên đến từ phần cứng: bật thiết bị lên và xem có khói bốc ra không. Trong phần mềm, một **smoke test** kiểm tra **các chức năng quan trọng nhất có hoạt động hay không** trên một build mới, để việc test sâu hơn có ý nghĩa.

* **Khi nào:** ở mỗi build hoặc mỗi lần deploy mới, trước mọi hoạt động test khác. Thường được tự động hóa trong CI pipeline dưới dạng **build verification test (BVT)**.
* **Phạm vi:** **rộng và nông**: nhiều vùng, mỗi vùng một kiểm tra nhanh.
* **Độ sâu:** trang có mở được không, thao tác chính có hoàn tất không? Không xét edge case.
* **Nếu fail:** build bị **từ chối** và trả lại. Không ai bắt đầu test chi tiết.

Smoke test cho một shop online:

1. Trang chủ tải được.
2. Người dùng đăng nhập được.
3. Tìm kiếm trả về sản phẩm.
4. Thêm được sản phẩm vào giỏ.
5. Checkout đi tới được bước thanh toán.
6. Trang admin mở được.

Mười đến ba mươi phút, không phải hàng giờ.

## Sanity testing

Một **sanity test** là một kiểm tra nhanh, tập trung, xem **một thay đổi hoặc bản fix cụ thể có hoạt động hợp lý** không, trước khi đầu tư cả một vòng test đầy đủ cho nó.

* **Khi nào:** sau một thay đổi nhỏ, một bản fix hoặc một thay đổi cấu hình, thường trên một build đã khá ổn định.
* **Phạm vi:** **hẹp và sâu**: một vùng, được kiểm tra kỹ hơn.
* **Độ sâu:** chức năng bị thay đổi và các phần ngay sát nó, với vài biến thể.
* **Nếu fail:** thay đổi được trả về cho developer; chưa cần chạy full regression.

Sanity test sau bản fix tính năng "đổi địa chỉ giao hàng": đổi địa chỉ trên một đơn hàng đang mở, kiểm tra địa chỉ mới trên trang đơn hàng và trong email xác nhận, thử một địa chỉ có tên đường dài, và kiểm tra đơn hàng đã giao đi thì không thể đổi nữa.

Sanity testing thường không có kịch bản hoặc chỉ có kịch bản sơ lược, dựa trên hiểu biết của tester về thay đổi.

## So sánh

| | Smoke testing | Sanity testing |
|---|---|---|
| Câu hỏi | Build này đủ ổn định để test chưa? | Thay đổi này có hợp lý không? |
| Độ bao phủ | Rộng và nông | Hẹp và sâu |
| Khi nào kích hoạt | Mỗi build mới | Một thay đổi hoặc bản fix cụ thể |
| Tài liệu hóa | Thường có kịch bản, hay được tự động hóa | Thường không có kịch bản |
| Quy mô điển hình | Các luồng quan trọng của toàn sản phẩm | Một tính năng và các phần lân cận |
| Khi fail | Từ chối build | Trả lại thay đổi |

Cả hai đều là **cửa kiểm soát** (gate): chúng quyết định có nên bỏ thêm công sức hay không. Không cái nào thay thế được regression testing. Sanity testing gần với retesting, nhưng rộng hơn việc chạy lại một test đã fail: nó kiểm tra toàn bộ vùng bị thay đổi có hợp lý không.

## Trên một bản release thật

Release 3.2 của một shop thêm Apple Pay và sửa một bug khiến bộ đếm giỏ hàng hiển thị sai số.

1. **Smoke test** trên build mới: trang chủ, đăng nhập, tìm kiếm, giỏ hàng, checkout, admin. Tất cả pass, nên build được chấp nhận.
2. **Sanity test** cho bản fix giỏ hàng: thêm, xóa và đổi số lượng, kiểm tra bộ đếm sau mỗi lần, kể cả trên mobile.
3. **Functional testing** cho tính năng mới Apple Pay.
4. **Regression testing** cho thanh toán và giỏ hàng, chọn theo impact analysis.
5. Sau khi deploy lên production, chạy lại một lượt **smoke test** ngắn trên production.

Nếu bước 1 fail (ví dụ đăng nhập trả về lỗi), các bước 2 đến 5 sẽ không được bắt đầu.

> Ý chính: smoke testing rộng và nông, hỏi "có test được build này không?"; sanity testing hẹp và sâu, hỏi "thay đổi này có hợp lý không?". Cả hai là những cửa kiểm soát nhanh trước công việc test thật sự.
