Test level cho biết test **ở đâu**. Test type cho biết test **cái gì** và thiết kế test **như thế nào**. Loại nào cũng có thể xuất hiện ở cấp độ nào: một unit test có thể kiểm tra performance, và một system test có thể được thiết kế dựa trên code. Có ba cặp từ xuất hiện trong mọi cuộc trao đổi về QA.

## Functional và non-functional

**Functional testing** kiểm tra hệ thống làm **cái gì**: các tính năng và quy tắc nghiệp vụ. Tổng tiền có đúng không, email có tới không, người dùng có bị khóa sau năm lần nhập sai mật khẩu không?

**Non-functional testing** kiểm tra hệ thống làm việc đó **tốt đến mức nào**: tốc độ, dễ sử dụng, accessibility, bảo mật, độ tin cậy, tương thích. Một trang checkout tính đúng tổng tiền nhưng mất 20 giây thì đúng về functional và hỏng về non-functional.

| | Functional | Non-functional |
|---|---|---|
| Câu hỏi | Nó có làm đúng việc không? | Nó làm có đủ tốt không? |
| Ví dụ với form đăng nhập | Mật khẩu đúng thì người dùng đăng nhập được | Đăng nhập phản hồi trong 1 giây khi có 500 người dùng cùng lúc |
| Ví dụ với checkout | Mã giảm giá `SAVE15` giảm 15 % | Trang dùng được chỉ bằng bàn phím |
| Nguồn thường gặp | User story, quy tắc nghiệp vụ | Yêu cầu chất lượng, tiêu chuẩn (WCAG), SLA |

Yêu cầu non-functional thường bị thiếu trong user story. Hãy hỏi ("nhanh thế nào là đủ nhanh?") thay vì tự đoán.

## Black-box và white-box

Hai từ này mô tả **cách thiết kế test**, không phải ai là người chạy test.

* **Black-box testing:** test được suy ra từ **đặc tả và hành vi**, không nhìn vào code. Bạn biết input và output mong đợi. Kỹ thuật: equivalence partitioning, boundary value analysis, decision table, state transition.
* **White-box testing:** test được suy ra từ **cấu trúc bên trong**: code, các nhánh, kiến trúc. Mục tiêu là coverage (độ bao phủ), ví dụ làm cho mỗi câu `if` đi qua cả nhánh đúng lẫn nhánh sai.
* **Grey-box testing:** kết hợp cả hai. Bạn test qua UI hoặc API như một black-box tester, nhưng dùng một phần hiểu biết bên trong (schema database, log, các API call mà trang gọi) để nhắm chính xác hơn.

Ví dụ: quy tắc là "miễn phí vận chuyển từ 50 USD". Black-box tester thử 49.99, 50.00 và 50.01. White-box tester đọc `if (total > 50)`, thấy 50.00 đi vào nhánh sai, và viết test cho nó. Cả hai tìm ra cùng một bug từ hai điểm xuất phát khác nhau.

Phần lớn công việc QA thủ công là black-box hoặc grey-box. Thiết kế white-box thường gặp trong unit test do developer viết.

## Positive và negative testing

* **Positive testing** (happy path) dùng input **hợp lệ** và kiểm tra hệ thống làm đúng việc phải làm: email và mật khẩu hợp lệ thì đăng nhập được.
* **Negative testing** dùng input **không hợp lệ hoặc bất ngờ** và kiểm tra hệ thống **xử lý nó một cách đàng hoàng**: thông báo lỗi rõ ràng, không crash, không lưu dữ liệu, không hiện stack trace.

Ý tưởng negative cho form đăng ký:

* email không có `@`, hoặc có khoảng trắng ở hai đầu
* mật khẩu 7 ký tự khi tối thiểu là 8
* để trống một field bắt buộc
* tên dài 10 000 ký tự
* đăng ký cùng một email hai lần
* bấm **Sign up** hai lần thật nhanh

Một negative test **pass** khi hệ thống từ chối input xấu một cách đúng đắn. "Negative" mô tả input, không phải verdict mong đợi.

Người mới thường chỉ viết positive test vì requirement mô tả happy path. Người dùng thật thì gõ nhầm, dán, bấm đúp và mất kết nối, nên một bộ test tốt thường có nhiều negative case hơn positive case.

## Ghép các từ lại với nhau

Một test có thể được mô tả bằng cả ba cặp. "Nhập mật khẩu 7 ký tự và mong đợi lỗi *Password must be at least 8 characters*" là một test **functional**, **black-box**, **negative**, chạy ở cấp **system**.

> Ý chính: functional là hệ thống làm *cái gì*, non-functional là làm *tốt đến đâu*; black-box thiết kế test từ hành vi, white-box từ code; negative test kiểm tra input xấu được xử lý đúng, và nó pass khi điều đó xảy ra.
