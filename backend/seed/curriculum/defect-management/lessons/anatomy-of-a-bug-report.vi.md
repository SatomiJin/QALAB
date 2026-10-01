Bug report là một lời nhắn gửi cho người không có mặt lúc bạn thấy vấn đề. Nó phải giúp developer tái hiện được failure, hiểu mức ảnh hưởng và quyết định cần làm gì, mà không phải hỏi lại bạn câu nào. Team nào cũng dùng những trường gần giống nhau; ứng dụng này dùng mười trường dưới đây.

## Các trường

| Trường | Nội dung | Ví dụ |
|---|---|---|
| Bug ID | Mã tham chiếu duy nhất, thường do công cụ quản lý bug cấp | BUG-1042 |
| Title | Cái gì sai, ở đâu, trong điều kiện nào | Checkout: nút Pay vẫn bị vô hiệu hoá sau khi nhập thẻ hợp lệ |
| Environment | Nơi bạn thấy lỗi: build, môi trường, trình duyệt hoặc thiết bị, hệ điều hành | staging, build 2.14.0, Chrome 128, Windows 11 |
| Preconditions | Điều gì phải đúng trước bước 1 | Đã đăng nhập bằng tài khoản khách hàng, giỏ hàng có một sản phẩm |
| Steps to Reproduce | Các thao tác đánh số, mỗi bước một thao tác | 1. Mở checkout. 2. Nhập thẻ 4242 4242 4242 4242… |
| Actual Result | Hệ thống đã làm gì | Nút Pay vẫn màu xám, không có thông báo lỗi |
| Expected Result | Lẽ ra hệ thống phải làm gì, và căn cứ ở đâu | Nút Pay được bật (đặc tả CHK-7) |
| Severity | Mức ảnh hưởng lên hệ thống | major |
| Priority | Mức khẩn cấp của việc sửa | high |
| Attachment | Bằng chứng: ảnh chụp màn hình, video, log, file HAR | pay-disabled.mp4, console.log |

Severity và priority được tách thành hai trường là có chủ đích. Bài sau sẽ nói kỹ về chúng.

## Một title tốt

Title là thứ mọi người đọc trong danh sách 300 bug, trong buổi triage hay trong thông báo. Một công thức hữu ích:

**[Khu vực]: [cái gì sai] [khi nào / trong điều kiện nào]**

| Title yếu | Title tốt hơn |
|---|---|
| Login hỏng | Login: báo "Invalid password" với mật khẩu đúng có chứa ký tự `&` |
| Bug ở giỏ hàng | Cart: số lượng bị đặt lại về 1 sau khi tải lại trang |
| App crash!!! | App Android bị crash khi tải lên ảnh đại diện lớn hơn 10 MB |

Một title tốt nêu được vị trí, triệu chứng và điều kiện kích hoạt. Nó không chứa cảm xúc ("tệ quá", "lại nữa"), và không cố đoán nguyên nhân trong code.

## Các bước tái hiện tối giản

Steps là phần cốt lõi của report. Hãy viết sao cho bất kỳ ai cũng làm theo được từ trạng thái ban đầu:

1. Bắt đầu từ preconditions, không phải từ "tôi test được một lúc thì…".
2. Mỗi bước một thao tác, kèm đúng dữ liệu bạn đã dùng (`test+1@example.com`, số lượng `0`).
3. Bỏ mọi bước không cần thiết. Nếu bỏ bước 4 mà bug vẫn xuất hiện, hãy xoá bước 4.
4. Dừng ở bước mà vấn đề xuất hiện; kết quả thuộc về **Actual Result**.

Các bước tối giản tiết kiệm thời gian cho developer và thường chỉ ra luôn nguyên nhân: nếu bug chỉ xuất hiện khi email có dấu `+`, các bước sẽ cho thấy điều đó.

## Actual và expected

**Actual result** là sự thật bạn quan sát được: thông báo, con số, status code. **Expected result** là điều lẽ ra phải xảy ra, và tốt nhất là nêu quy tắc đó đến từ đâu (requirement, thiết kế, phiên bản trước). "Không chạy" chẳng phải cái nào cả. "Tổng tiền hiển thị 18.00 USD; lẽ ra phải là 17.00 USD (giảm 15 % của 20.00)" thì có cả hai.

## Bằng chứng

Đính kèm những gì chứng minh failure và giúp tìm ra defect:

* **ảnh chụp màn hình** có đánh dấu chỗ lỗi, cho bug giao diện;
* **video** ngắn khi thứ tự thao tác hoặc thời điểm là quan trọng;
* **log**: console của trình duyệt, các dòng log server, request và response của lời gọi API (file HAR);
* **test data** bạn đã dùng, nếu nó không hiển nhiên.

Không bao giờ đính kèm mật khẩu, token hay dữ liệu thật của khách hàng. Hãy che chúng đi trước.

> Ý chính: một bug report là đầy đủ khi người lạ đọc nó có thể tái hiện failure và hiểu vì sao nó quan trọng, mà không cần nói chuyện với bạn.
