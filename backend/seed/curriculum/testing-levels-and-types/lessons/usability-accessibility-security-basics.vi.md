Có ba chất lượng non-functional mà bất kỳ tester thủ công nào cũng test được chỉ với một trình duyệt và một chút phương pháp: sản phẩm có **dễ dùng** không, **mọi người** có dùng được không, và nó có **bảo vệ** người dùng cùng dữ liệu của họ không? Bạn không cần là designer hay chuyên gia bảo mật mới tìm được những vấn đề nghiêm trọng ở cả ba mặt này.

## Usability

**Usability** (khả năng sử dụng) là mức độ dễ dàng để người dùng thật đạt được mục tiêu: hiệu quả, nhanh và không bực bội. Trong lúc test chức năng, hãy luôn tự hỏi:

* Người dùng lần đầu có tìm được thao tác chính mà không cần trợ giúp không?
* Nhãn, nút và thông báo lỗi có dùng ngôn ngữ của người dùng, không phải ngôn ngữ của developer không ("Invalid input" so với "Nhập ngày theo dạng 31/12/2026")?
* Hệ thống có ngăn sai sót không (vô hiệu hóa nút **Pay** khi đang xử lý, hỏi xác nhận trước khi xóa)?
* Dữ liệu đã nhập có được giữ lại sau khi báo lỗi, hay người dùng phải gõ lại từ đầu?
* Có nhất quán không: cùng một thao tác thì trông và hoạt động giống nhau trên mọi màn hình?

Hãy báo cáo vấn đề usability như mọi defect khác, kèm các bước, điều gì làm bạn bối rối và một đề xuất. Nghiên cứu usability thật với người dùng còn đi xa hơn, nhưng những kiểm tra này đã tìm ra nhiều vấn đề từ sớm.

## Accessibility

**Accessibility (a11y — khả năng tiếp cận)** nghĩa là người khuyết tật cũng dùng được sản phẩm: người khiếm thị dùng screen reader, người không dùng được chuột, người thị lực kém hoặc mù màu. Tiêu chuẩn tham chiếu là **WCAG** (Web Content Accessibility Guidelines); hầu hết các công ty và nhiều quy định pháp luật nhắm tới mức **AA**.

Các kiểm tra cơ bản tester làm được mà không cần công cụ đặc biệt:

| Kiểm tra | Cách làm | Điều phải xảy ra |
|---|---|---|
| **Chỉ dùng bàn phím** | Cất chuột đi; dùng `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc` | Mọi link, nút và field đều tới được và dùng được, theo thứ tự hợp lý; không bị kẹt bàn phím (keyboard trap) |
| **Focus nhìn thấy được** | Bấm `Tab` qua cả trang | Lúc nào bạn cũng thấy phần tử nào đang có focus |
| **Label** | Bấm vào label của một field; đọc form | Mỗi field có một label nhìn thấy được và gắn với nó, không chỉ là placeholder biến mất khi gõ |
| **Lỗi** | Gửi form có lỗi | Thông báo lỗi nói cái gì sai và cách sửa, nằm cạnh field, không chỉ dựa vào màu sắc |
| **Độ tương phản** | Dùng công cụ kiểm tra contrast (developer tools của trình duyệt có hiển thị) | Chữ thường có tỉ lệ tương phản tối thiểu **4.5:1** so với nền |
| **Hình ảnh** | Kiểm tra các hình ảnh mang ý nghĩa | Chúng có văn bản thay thế (`alt`) mô tả nội dung |
| **Phóng to** | Zoom trình duyệt lên 200 % | Nội dung vẫn vừa và dùng được, không bị chồng lên nhau |

Công cụ tự động (như Lighthouse hay axe trong trình duyệt) tìm nhanh được một số vấn đề, nhưng chúng không thể biết thứ tự focus có hợp lý không hay thông báo lỗi có rõ ràng không. Kiểm tra thủ công vẫn cần thiết.

## Cơ bản về security cho tester

Penetration testing là công việc của chuyên gia, nhưng nhiều defect bảo mật có thể được một tester thủ công cẩn thận phát hiện. Hãy theo tinh thần của **OWASP** Top 10, danh sách rủi ro ứng dụng web nổi tiếng nhất, và chỉ test trong phạm vi bạn được phép.

**Xác thực và phiên đăng nhập**

* Sai mật khẩu và email không tồn tại cho ra **cùng** một thông báo, để kẻ tấn công không biết được tài khoản nào tồn tại.
* Số lần đăng nhập sai liên tiếp bị giới hạn (khóa hoặc làm chậm).
* Sau khi logout, nút **Back** của trình duyệt không hiển thị trang riêng tư, và session cũ không còn dùng được.
* Link đặt lại mật khẩu có hạn sử dụng và chỉ dùng được một lần.

**Kiểm soát truy cập**

* Đổi id trên URL: `/orders/1042` thành `/orders/1043`. Bạn không được nhìn thấy đơn hàng của khách khác (một defect kinh điển gọi là IDOR).
* Người dùng thường mở thẳng URL của admin phải nhận "forbidden" hoặc "not found", không phải trang admin.

**Kiểm tra input**

* Thử ký tự đặc biệt và input rất dài ở mọi field: `'`, `"`, `<script>alert(1)</script>`. Văn bản phải được lưu và hiển thị như văn bản thuần, không bao giờ được thực thi, và không bao giờ gây lỗi server.
* Validation cũng phải có ở server: một giá trị bị form từ chối thì API cũng phải từ chối.

**Lộ dữ liệu**

* Trang lỗi không hiển thị stack trace, câu SQL hay phiên bản server.
* Response trong tab Network không chứa nhiều dữ liệu hơn màn hình cần (không có password hash, không có email của người dùng khác).
* Dữ liệu nhạy cảm không bao giờ nằm trên URL (token, mật khẩu) và các trang dùng **HTTPS**.

> Ý chính: usability, accessibility và security là một phần của chất lượng, không phải phần thêm. Một bàn phím, một công cụ kiểm tra contrast, tab Network và sự tò mò đã đủ để tìm ra những defect nghiêm trọng.
