Phần mềm được kiểm thử ở nhiều **cấp độ** (level), từ mẩu code nhỏ nhất đến toàn bộ sản phẩm trong tay người dùng. Mỗi cấp độ có mục tiêu riêng, người thực hiện riêng, **test basis** riêng (tài liệu và hiểu biết dùng để suy ra test) và những loại defect điển hình riêng. Hiểu các cấp độ giúp bạn biết nên chờ đợi bug nào, và bug nào lẽ ra phải bị bắt từ sớm hơn.

## Unit testing

Một **unit** (hay component) là phần nhỏ nhất có thể test được: một hàm, một class, một React component. Unit test kiểm tra nó **một cách cô lập**: các thành phần xung quanh (database, API, module khác) được thay bằng fake hoặc mock.

* **Ai làm:** thường là chính developer viết code, thường được tự động hóa và chạy ở mỗi commit.
* **Test basis:** thiết kế chi tiết, chính đoạn code, contract của hàm.
* **Defect điển hình:** tính toán sai, lệch một đơn vị ở giá trị biên (`age > 18` thay vì `age >= 18`), thiếu kiểm tra `null`, logic sai trong một nhánh.

Ví dụ: `calculateShipping(49.99)` trả về `5.00` và `calculateShipping(50.00)` trả về `0.00`.

## Integration testing

**Integration testing** kiểm tra các unit hoặc các hệ thống **làm việc với nhau** có đúng không: các interface và dữ liệu đi qua chúng.

* **Component integration:** các module trong cùng một ứng dụng (service checkout gọi service tính giá).
* **System integration:** hệ thống của bạn với hệ thống bên ngoài (cổng thanh toán, dịch vụ email, API của đối tác).
* **Ai làm:** developer và tester.
* **Test basis:** đặc tả interface, API contract, sequence diagram.
* **Defect điển hình:** sai định dạng dữ liệu (ngày gửi đi là `01/02/2026` nhưng bên nhận hiểu là 1 tháng 2 thay vì 2 tháng 1), thiếu field, sai đơn vị (cent và dollar), timeout và response lỗi không được xử lý.

## System testing

**System testing** kiểm tra **toàn bộ hệ thống đã tích hợp** từ đầu đến cuối so với requirement, trong một môi trường càng giống production càng tốt (thường gọi là staging).

* **Ai làm:** một đội test độc lập hoặc các QA engineer của đội sản phẩm.
* **Test basis:** requirement, user story và acceptance criteria, use case, phân tích rủi ro.
* **Defect điển hình:** một luồng nghiệp vụ bị gãy khi đi qua nhiều màn hình, hành vi sai so với requirement, lỗi chỉ xuất hiện với cấu hình thật, và các vấn đề non-functional (trang chậm, luồng khó hiểu).

Ví dụ: đăng ký, xác minh email, đăng nhập, thêm hai sản phẩm vào giỏ, thanh toán bằng thẻ test, và nhận được xác nhận đơn hàng.

## Acceptance testing

**Acceptance testing** trả lời một câu hỏi khác: không phải "nó có chạy không?" mà là "**nó có dùng được cho công việc thật không, và chúng ta có chấp nhận nó không?**". Mục tiêu là sự tự tin, không phải tìm thật nhiều bug; nếu ở cấp độ này còn nhiều bug thì nghĩa là các cấp độ trước đã làm chưa tốt.

* **User acceptance testing (UAT):** người dùng thật hoặc đại diện nghiệp vụ kiểm tra hệ thống có hỗ trợ được công việc của họ không.
* **Operational acceptance testing:** đội vận hành kiểm tra backup, monitoring, cài đặt và khôi phục.
* **Contractual và regulatory acceptance:** hệ thống đáp ứng hợp đồng hoặc quy định pháp luật (ví dụ quy định bảo vệ dữ liệu).
* **Alpha testing:** do người dùng hoặc một đội nội bộ thực hiện **tại nơi phát triển**, trước khi release.
* **Beta testing:** do người dùng thật thực hiện **trong môi trường của chính họ**, trên phiên bản trước release, và gửi phản hồi.

* **Test basis:** quy trình nghiệp vụ, yêu cầu của người dùng, hợp đồng, quy định.
* **Defect điển hình:** hệ thống làm đúng như đặc tả, nhưng đặc tả lại không khớp với cách mọi người thực sự làm việc.

## Năm cấp độ theo thuật ngữ ISTQB

Syllabus ISTQB gọi tên năm cấp độ test, vì tách integration làm hai:

1. **Component testing** (unit testing).
2. **Component integration testing**: giao tiếp giữa các thành phần trong cùng một hệ thống.
3. **System testing**.
4. **System integration testing**: giao tiếp với hệ thống khác và dịch vụ bên ngoài, trong môi trường gần giống production.
5. **Acceptance testing**.

Các cấp độ được phân biệt bằng **test object**, **test objective**, **test basis**, loại **defect và failure** nhắm tới, và **cách tiếp cận cùng trách nhiệm**: đúng các hàng của bảng bên dưới. Trong các mô hình tuần tự, exit criteria của cấp độ này thường là một phần entry criteria của cấp độ sau.

## So sánh các cấp độ

| Cấp độ | Câu hỏi | Ai làm | Test basis | Defect điển hình |
|---|---|---|---|---|
| Unit | Mẩu này có chạy đúng không? | Developer | Code, thiết kế chi tiết | Tính sai, lỗi ở giá trị biên |
| Integration | Các phần có nói chuyện đúng với nhau không? | Developer, tester | Interface, API contract | Sai định dạng dữ liệu, response lỗi không được xử lý |
| System | Cả sản phẩm có đáp ứng requirement không? | Đội test | Requirement, user story | Luồng end-to-end bị gãy |
| Acceptance | Có dùng được cho công việc thật không? | Người dùng, khách hàng, vận hành | Quy trình nghiệp vụ, hợp đồng | Không khớp với quy trình làm việc thật |

Các cấp độ không phải lúc nào cũng là những giai đoạn nối tiếp nhau. Trong đội agile, tất cả có thể diễn ra trong cùng một sprint. Điều không đổi là ý tưởng: tìm mỗi loại defect ở cấp độ rẻ nhất có thể tìm thấy nó.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 2.2 "Test levels and test types" và 2.2.1 "Test levels". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: mỗi cấp độ kiểm thử có mục tiêu, người thực hiện và test basis riêng. Một bug bị phát hiện ở UAT mà lẽ ra unit test đã bắt được là một bug bị phát hiện quá muộn.
