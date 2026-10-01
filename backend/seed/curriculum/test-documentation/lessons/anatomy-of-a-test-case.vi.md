Một test case tốt là test case mà người khác có thể nhận lấy, chạy mà không cần hỏi bạn điều gì, và ra cùng verdict. Điều đó chỉ xảy ra khi mỗi trường làm đúng việc của nó. Bài này đi qua các trường mà ứng dụng dùng trong bài tập test case, rồi đến những thói quen phân biệt một test case hữu ích với một test case lặng lẽ bị bỏ qua.

## Các trường

| Trường | Chứa gì | Ví dụ (form đăng ký) |
|---|---|---|
| Test Case ID | Mã định danh duy nhất, ổn định, thường có tiền tố theo tính năng | TC-SIGNUP-007 |
| Title | Một câu: kiểm tra cái gì, trong điều kiện nào | Đăng ký từ chối mật khẩu ngắn hơn 8 ký tự |
| Preconditions | Điều phải đúng *trước* bước 1: trạng thái, tài khoản, cấu hình | Người dùng đang đăng xuất; chưa có tài khoản nào cho nina@example.com |
| Test Data | Các giá trị chính xác được dùng | Email nina@example.com, mật khẩu Short-1 (7 ký tự) |
| Steps | Các thao tác đánh số, mỗi bước một thao tác | 1. Mở /register. 2. Nhập email. 3. Nhập mật khẩu. 4. Bấm **Create account**. |
| Expected Result | Điều phải quan sát được nếu phần mềm đúng | Lỗi "Password must be at least 8 characters" dưới ô mật khẩu; không có tài khoản nào được tạo |
| Priority | Case này cần được chạy sớm đến mức nào (High, Medium, Low) | High |
| Test Type | Loại test | Functional, negative |

Severity thuộc về bug report, không thuộc về test case. **Priority** của test case cho biết việc chạy nó quan trọng đến đâu: case về đăng nhập hay thanh toán là high, case về màu của một link ở footer là low. Khi thiếu thời gian, các case ưu tiên cao được chạy trước.

## Mỗi case kiểm tra một điều

Mỗi test case kiểm chứng **một** hành vi. "Đăng ký với mật khẩu ngắn, mật khẩu dài và email sai định dạng" cho một verdict cho ba lần kiểm tra: nếu fail, phần nào fail? Và nếu phần mật khẩu ngắn pass nhưng phần email fail, cả case là Fail và hành vi đang chạy đúng bị che mất. Hãy tách thành ba case. Một case vẫn có thể có nhiều **điểm quan sát** của cùng một hành vi (thông báo lỗi xuất hiện *và* không có tài khoản nào được tạo).

## Expected result quan sát được

Expected result phải là thứ bạn nhìn thấy, đo được hoặc truy vấn được, để verdict không phải là ý kiến cá nhân.

| Không quan sát được | Quan sát được |
|---|---|
| Hệ thống hoạt động đúng | Dashboard mở ra và hiện "Welcome, Nina" |
| Validation được xử lý đúng cách | Lỗi "Password must be at least 8 characters" xuất hiện dưới ô mật khẩu |
| Đơn hàng được lưu | Đơn #1042 xuất hiện trong **My orders** với trạng thái *Paid* |
| API có phản hồi | Status code 400; body có `details[0].field` = `password` |

Viết expected result dựa trên **requirement**, đừng bao giờ dựa trên những gì phần mềm đang làm. Nếu chép lại hành vi hiện tại, bug sẽ trở thành kết quả mong đợi.

## Preconditions, steps và test data

* **Preconditions** mô tả một *trạng thái*, không phải thao tác: "người dùng đã đăng nhập", "giỏ hàng có một sản phẩm". Việc chuẩn bị trạng thái đó không phải là điều bạn đang kiểm tra.
* **Steps** là các thao tác đang được test. Mỗi bước là một hành động người dùng làm được: mở, nhập, bấm, chọn.
* **Test data** liệt kê giá trị cụ thể. "Một email hợp lệ" không phải test data; `nina@example.com` mới là test data. Với kiểm tra boundary value, ghi chính xác giá trị và độ dài của nó ("7 ký tự").

## Những lỗi thường gặp

* Title mơ hồ ("Test đăng ký") không nói điều kiện nào được kiểm tra.
* Nhiều lần kiểm tra trong một case, nên khi fail không biết cái gì hỏng.
* Thiếu expected result, hoặc chỉ có ở bước cuối trong khi một bước trước đó cũng quan trọng.
* Các bước giấu quyết định ("nhập dữ liệu không hợp lệ"): dữ liệu không hợp lệ nào?
* Preconditions bị trộn vào các bước ("1. Tạo tài khoản. 2. Đăng xuất. 3. …").
* Phụ thuộc ngầm vào dữ liệu mà test case khác để lại; mỗi case tự chuẩn bị trạng thái của mình.
* Các case copy-paste chỉ khác nhau ở title.

## Một ví dụ hoàn chỉnh

| Trường | Giá trị |
|---|---|
| Test Case ID | TC-LOGIN-012 |
| Title | Đăng nhập chấp nhận email có chữ hoa và khoảng trắng ở hai đầu |
| Preconditions | Đã có tài khoản đã xác minh cho nina@example.com; người dùng đang đăng xuất |
| Test Data | Email "  Nina@Example.COM  ", mật khẩu Correct-Pass-1 |
| Steps | 1. Mở trang đăng nhập. 2. Nhập email. 3. Nhập mật khẩu. 4. Bấm **Log in**. |
| Expected Result | Dashboard mở ra cho nina@example.com |
| Priority | Medium |
| Test Type | Functional |

> Ý chính: một test case tốt kiểm tra một hành vi, bắt đầu từ preconditions đã nêu rõ, dùng test data cụ thể, mỗi bước một thao tác, và kết thúc bằng expected result mà ai cũng quan sát được. Nếu một tester khác có thể ra verdict khác, test case đó chưa xong.
