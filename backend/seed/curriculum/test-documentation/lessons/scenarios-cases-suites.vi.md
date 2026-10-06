Tài liệu kiểm thử có nhiều mức chi tiết khác nhau. **Test scenario** nói cần kiểm tra *cái gì*, **test case** nói chính xác kiểm tra *thế nào*, còn **test suite** gom các test case được chạy cùng nhau. Chọn đúng mức cho từng việc là một kỹ năng: quá ít chi tiết thì không ai lặp lại được bài test của bạn, quá nhiều thì cả sprint chỉ ngồi viết thay vì test.

## Ba mức chi tiết

| | Test scenario | Test case | Test suite |
|---|---|---|---|
| Là gì | Một tình huống cần kiểm tra, viết trong một dòng | Preconditions, dữ liệu, các bước và kết quả mong đợi chính xác | Một nhóm test case có tên |
| Trả lời | Điều gì có thể xảy ra? | Kiểm tra thế nào, và phải thấy gì? | Những case nào chạy cùng nhau? |
| Ví dụ | Kiểm tra đăng nhập với tài khoản bị khóa | TC-LOGIN-005: người dùng bị khóa anna@example.com nhập đúng mật khẩu → thông báo "Account locked, try again in 15 minutes" | Smoke suite, bộ regression cho đăng nhập |
| Công sức viết | Vài phút | Lâu hơn, mỗi lần kiểm tra một case | Chỉ cần gom nhóm |

## Test scenario

Scenario là ý tưởng một dòng về việc người dùng có thể làm hoặc điều có thể hỏng. Scenario được rút ra trực tiếp từ requirement và user story, và là cách nhanh nhất để thấy **độ rộng** của việc test: liệt kê chúng trước, review cùng developer và product owner, bạn sẽ phát hiện các trường hợp bị bỏ sót trước khi viết chi tiết.

Với tính năng đăng nhập:

* Đăng nhập bằng email và mật khẩu hợp lệ
* Đăng nhập với mật khẩu sai
* Đăng nhập với tài khoản chưa xác minh
* Đăng nhập với tài khoản bị khóa
* Đăng nhập khi email có chữ hoa hoặc có khoảng trắng ở hai đầu

## Test case

Mỗi scenario trở thành một hoặc nhiều test case. "Đăng nhập với mật khẩu sai" có thể cần hai case: một cho mật khẩu sai của tài khoản có thật, một cho email không tồn tại (cả hai phải hiện cùng một thông báo chung). Test case phải đủ chi tiết để một tester khác, hoặc automation engineer, ra cùng verdict với bạn. Module sau sẽ đi qua từng trường của nó.

## Test suite

Suite gom các case theo một mục đích, và một case có thể nằm trong nhiều suite:

| Suite | Gồm | Chạy khi |
|---|---|---|
| Smoke | 10–20 case cho các luồng quan trọng nhất | Mỗi build mới, trước mọi thứ khác |
| Theo tính năng (đăng nhập) | Mọi case về đăng nhập | Khi phần đăng nhập thay đổi |
| Regression | Case cho mọi thứ đã phát hành | Trước mỗi lần release |

Các công cụ quản lý test (TestRail, Zephyr, Xray, hoặc một bảng tính) cho phép tạo suite bằng danh sách hoặc tag, và chạy một suite thành một **test run** với các verdict riêng.

## Ví dụ: checkout với mã giảm giá

| Mức | Ví dụ |
|---|---|
| Scenario | Áp một mã giảm giá hợp lệ ở checkout |
| Test case | TC-CHK-010: người dùng đã đăng nhập, giỏ hàng có một sản phẩm giá 50.00 USD; nhập `SAVE10` và bấm **Apply** → dòng giảm giá −5.00 USD, tổng 45.00 USD |
| Suite | Checkout regression (cùng TC-CHK-001 … TC-CHK-030) |

## Khi nào dùng mức nào

| Tình huống | Thường là đủ |
|---|---|
| Tester có kinh nghiệm khám phá sớm một tính năng mới | Scenario dùng như checklist |
| Regression mà ai trong team cũng phải chạy giống nhau | Test case chi tiết |
| Audit hoặc hợp đồng yêu cầu bằng chứng cho từng requirement | Test case chi tiết kèm kết quả đã ghi lại |
| Case sẽ được tự động hóa | Test case chi tiết (script cần dữ liệu và điểm kiểm tra chính xác) |
| Lên kế hoạch tối nay chạy gì | Suite |

Nhiều team kết hợp cả ba: scenario cho phần việc mới, test case chi tiết cho các luồng quan trọng nhất và cho mọi thứ phải lặp lại hoặc tự động hóa.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.4.1 "Test activities and tasks" (test condition, test case, test procedure và test suite). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus.
* "Test scenario" là thuật ngữ phổ biến trong ngành, không phải thuật ngữ ISTQB; khái niệm gần nhất trong ISTQB là test condition. Phần giải thích và ví dụ checkout do team QALAB tự biên soạn.

> Ý chính: scenario cho độ rộng (kiểm tra cái gì), test case cho độ chính xác (kiểm tra thế nào, với dữ liệu nào, và điều gì phải xảy ra), còn suite quyết định những gì được chạy cùng nhau. Chọn mức giúp người tiếp theo ra cùng kết quả với bạn.
