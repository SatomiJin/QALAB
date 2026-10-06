Kiểm thử phần mềm là công việc **tìm hiểu sản phẩm thực sự hoạt động ra sao** rồi so sánh với cách nó phải hoạt động, để cả nhóm quyết định được sản phẩm đã sẵn sàng hay chưa. Nó không chỉ là chạy phần mềm: đọc requirement, thiết kế test và báo cáo kết quả cũng là kiểm thử.

## Kiểm thử là để có thông tin

Tester không "làm cho phần mềm tốt lên". Tester tạo ra thông tin:

* cái gì chạy đúng như mong đợi,
* cái gì không đúng, và nghiêm trọng đến mức nào,
* cái gì chưa được kiểm tra.

Cả nhóm (product owner, developer và bạn) dùng thông tin đó để quyết định: release, sửa trước, hay chấp nhận rủi ro.

## Kiểm thử nhắm tới điều gì

Một đợt kiểm thử thường có cùng lúc nhiều **test objective** (mục tiêu kiểm thử). Những mục tiêu điển hình:

| Mục tiêu | Ví dụ trên form đăng ký |
|---|---|
| Đánh giá sản phẩm công việc | Review story đăng ký trước khi code |
| Gây ra failure và tìm defect | Thử email không có "@" xem cái gì hỏng |
| Đạt độ bao phủ (coverage) yêu cầu | Mỗi acceptance criterion có ít nhất một test |
| Giảm rủi ro chất lượng kém | Test kỹ nhất quy tắc mật khẩu: chúng bảo vệ tài khoản |
| Verify requirement được đáp ứng | "Mật khẩu 8–72 ký tự" thật sự nhận 8 và 72 |
| Kiểm tra quy định pháp lý, hợp đồng | Ô đồng ý chính sách quyền riêng tư là bắt buộc |
| Cung cấp thông tin để ra quyết định | "Còn hai bug minor, không có blocker: sẵn sàng release" |
| Tạo sự tự tin | Toàn bộ happy path pass trên mọi trình duyệt được hỗ trợ |
| Validate đáp ứng nhu cầu người dùng | Người dùng thật tự hoàn thành đăng ký mà không cần trợ giúp |

Mục tiêu nào quan trọng nhất tùy vào bối cảnh: sản phẩm, rủi ro, mô hình phát triển và việc kinh doanh (ngân hàng và trò chơi ưu tiên khác nhau).

## Vì sao đáng bỏ công

| Phát hiện ở giai đoạn | Chi phí sửa thường gặp |
|---|---|
| Review requirement | Vài phút: sửa một câu |
| Phát triển | Vài giờ: sửa đoạn code vừa viết |
| Kiểm thử | Vài giờ đến vài ngày: sửa, build lại, test lại |
| Production | Vài ngày, cộng thêm hỗ trợ khách hàng, sửa dữ liệu và uy tín |

Phát hiện vấn đề càng muộn thì càng tốn kém. Vì vậy kiểm thử bắt đầu **trước** khi có code: review requirement cũng là kiểm thử (**static testing**); chạy phần mềm là **dynamic testing**.

## Kiểm thử không phải là debug

Testing và debugging là hai hoạt động khác nhau, thường do những người khác nhau làm:

1. **Testing** cho thấy có gì đó sai: một test làm lộ ra failure (dynamic testing), hoặc một buổi review chỉ ra defect trực tiếp (static testing).
2. **Debugging** là việc của developer sau khi có failure: tái hiện nó, tìm defect gây ra nó (chẩn đoán), rồi sửa.
3. **Confirmation testing** (retest) kiểm tra bản sửa, tốt nhất do chính người đã phát hiện failure làm; **regression testing** kiểm tra bản sửa không làm hỏng chỗ khác.

Khi review tìm ra defect thì không cần tái hiện hay chẩn đoán: defect đã nhìn thấy rõ, chỉ việc sửa.

## Verification và validation

* **Verification**: ta có đang làm sản phẩm đúng cách không? (Nó có khớp với đặc tả không?)
* **Validation**: ta có đang làm đúng sản phẩm không? (Nó có giải quyết được vấn đề của người dùng không?)

Một tính năng có thể qua verification mà vẫn trượt validation: nó khớp đặc tả, nhưng đặc tả lại sai.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.1 "What is testing?" và 1.2 "Why is testing necessary?". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: kiểm thử cung cấp thông tin để cả nhóm ra quyết định, qua nhiều mục tiêu cùng lúc. Kiểm thử tìm ra vấn đề; debugging sửa chúng. Kiểm thử giảm rủi ro hỏng hóc khi sử dụng, nhưng không chứng minh được là không còn defect.
