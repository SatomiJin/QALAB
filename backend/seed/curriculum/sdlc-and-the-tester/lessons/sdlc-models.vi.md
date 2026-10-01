**Software Development Life Cycle (SDLC)** (vòng đời phát triển phần mềm) là con đường một nhóm đi qua để biến một ý tưởng thành phần mềm chạy được và duy trì nó. STLC trong khoá học trước chạy bên trong SDLC. Mô hình SDLC mà nhóm chọn sẽ quyết định *khi nào* bạn được test, bạn test *dựa trên cái gì*, và một bug phát hiện muộn sẽ tốn kém đến mức nào.

## Các giai đoạn mọi mô hình đều có

Dù theo mô hình nào, các loại công việc vẫn giống nhau. Điểm khác là cách sắp xếp thứ tự và lặp lại chúng.

| Giai đoạn | Điều gì diễn ra | Tester làm gì |
|---|---|---|
| Requirement | Quyết định sản phẩm phải làm gì | Đặt câu hỏi, kiểm tra mỗi requirement có test được không |
| Thiết kế | Quyết định sẽ xây dựng thế nào | Review thiết kế, lên kế hoạch integration test và system test |
| Lập trình | Viết code | Chuẩn bị test case và test data, hỗ trợ unit test |
| Kiểm thử | Kiểm tra sản phẩm đã xây dựng | Chạy test, báo bug, retest bản sửa |
| Triển khai | Release cho người dùng | Smoke test trên production, kiểm tra bản release |
| Bảo trì | Sửa và cải tiến sau release | Regression test cho mọi thay đổi |

## Waterfall

Trong **waterfall** (mô hình thác nước), mỗi giai đoạn phải xong và được duyệt trước khi giai đoạn sau bắt đầu: toàn bộ requirement, rồi toàn bộ thiết kế, rồi toàn bộ code, rồi mới đến toàn bộ việc test. Mô hình này hợp với dự án có requirement ổn định, rõ ràng và cần nhiều tài liệu chặt chẽ (một số dự án trong lĩnh vực có quy định nghiêm ngặt hoặc làm theo hợp đồng).

Điểm yếu với tester: kiểm thử chỉ là một giai đoạn nằm ở cuối. Một requirement bị hiểu sai từ tháng thứ nhất đến tháng thứ chín mới lộ ra, khi việc sửa đồng nghĩa với làm lại cả thiết kế lẫn code. Khi tiến độ bị trễ, giai đoạn test thường là phần bị cắt bớt thời gian.

## V-model

**V-model** giữ thứ tự tuần tự của waterfall nhưng ghép mỗi giai đoạn phát triển với một **test level** (cấp độ kiểm thử). Test cho mỗi cấp độ được *thiết kế* ngay khi tài liệu phát triển tương ứng có, và được *thực thi* sau đó, trên nhánh đi lên của chữ V.

```text
Requirements ............................ Acceptance testing
   System design ...................... System testing
      Architecture design ........... Integration testing
         Detailed design ........... Component (unit) testing
                         Coding
```

| Giai đoạn phát triển (nhánh trái) | Test level (nhánh phải) | Test level đó kiểm tra gì |
|---|---|---|
| Business requirement | Acceptance testing | Hệ thống đáp ứng nhu cầu người dùng và có thể được chấp nhận |
| Thiết kế / đặc tả hệ thống | System testing | Toàn bộ hệ thống hoạt động đúng đặc tả, từ đầu đến cuối |
| Thiết kế kiến trúc | Integration testing | Các component và service phối hợp đúng qua các interface |
| Thiết kế chi tiết | Component (unit) testing | Từng hàm hoặc class hoạt động đúng khi đứng riêng |

Ví dụ với một cửa hàng online: trong lúc business analyst viết "khách hàng có thể thanh toán bằng thẻ", tester đã viết acceptance test cho việc thanh toán bằng thẻ. Khi kiến trúc sư quyết định order service sẽ gọi payment service, integration test cho lời gọi đó đã được lên kế hoạch. Đó là kiểm thử sớm được cài sẵn vào mô hình.

## Mô hình iterative và incremental

Các mô hình **iterative** (lặp) và **incremental** (tăng dần) xây sản phẩm theo từng phần nhỏ và lặp lại chu trình nhiều lần: lên kế hoạch một chút, xây một chút, test một chút, lấy phản hồi. Mỗi vòng lặp giao một phần sản phẩm chạy được, ví dụ "đăng ký" trước, rồi "checkout", rồi "mã giảm giá". Các phương pháp Agile như Scrum (bài sau) là ví dụ nổi tiếng nhất.

Với tester, điều này có nghĩa là:

* Kiểm thử diễn ra trong **mọi vòng lặp**, không phải một lần ở cuối.
* Requirement thay đổi, nên test case được giữ gọn và cập nhật thường xuyên.
* Mỗi phần mới đều có thể làm hỏng phần cũ, nên **regression testing** lớn dần sau mỗi vòng lặp, và tự động hoá nó rất đáng công.

## So sánh các mô hình

| | Waterfall | V-model | Iterative / Agile |
|---|---|---|---|
| Kiểm thử bắt đầu khi nào | Sau khi code xong | Thiết kế test bắt đầu cùng requirement | Từ vòng lặp đầu tiên |
| Phản hồi từ người dùng | Ở cuối | Ở cuối | Sau mỗi vòng lặp |
| Khả năng đón nhận requirement thay đổi | Kém | Kém | Tốt |
| Tài liệu điển hình | Nhiều | Nhiều | Gọn, vừa đủ |
| Rủi ro chính với tester | Test muộn, bị ép thời gian | Cứng nhắc khi requirement đổi | Khối lượng regression ngày càng lớn |

Không mô hình nào loại bỏ được nhu cầu kiểm thử. Điều thay đổi là công sức của tester dồn vào đâu: với waterfall và V-model là tài liệu kỹ lưỡng và các test level được lên kế hoạch, với cách làm iterative là phản hồi nhanh và regression.

> Ý chính: mô hình SDLC quyết định khi nào việc kiểm thử diễn ra. V-model ghép mỗi giai đoạn phát triển với một test level, còn các mô hình iterative test một chút trong mỗi vòng; ở mô hình nào cũng vậy, tester tham gia càng sớm thì defect càng rẻ.
