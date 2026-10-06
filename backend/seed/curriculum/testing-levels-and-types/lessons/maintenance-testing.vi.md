Phần lớn vòng đời của một sản phẩm diễn ra sau lần release đầu tiên. Nó được sửa bug, thêm tính năng, vá bảo mật, chuyển sang server mới, database mới, và đến một ngày nó bị tắt hẳn. Kiểm thử những thay đổi đó trên một hệ thống đang được sử dụng gọi là **maintenance testing** (kiểm thử bảo trì).

## Maintenance testing bao gồm những gì

Bảo trì có thể là **corrective** (sửa defect), **adaptive** (thích nghi với môi trường đã thay đổi, như trình duyệt hay hệ điều hành mới) hoặc nhằm cải thiện **hiệu năng** hay **khả năng bảo trì**. Nó đến dưới dạng **release có kế hoạch** hoặc **hot fix ngoài kế hoạch** cho sự cố gấp trên production.

Kiểm thử một thay đổi trên hệ thống đang chạy luôn có hai phần:

1. **Thay đổi có hoạt động không?** Test hành vi mới hoặc hành vi đã sửa (và xác nhận defect đã được sửa).
2. **Có chỗ nào khác bị hỏng không?** Chạy **regression test** trên những phần không bị thay đổi, thường là phần lớn hệ thống.

## Trigger: vì sao bắt đầu maintenance testing

| Trigger | Ví dụ | Cần test gì ngoài chính thay đổi |
|---|---|---|
| **Modification** (sửa đổi) | Release tính năng theo kế hoạch, sửa lỗi, hot fix khẩn cấp | Regression các khu vực bị thay đổi chạm tới |
| **Upgrade hoặc migration** (nâng cấp, chuyển đổi) | Chuyển sang nền tảng cloud mới, phiên bản database mới, framework mới; nhập dữ liệu từ ứng dụng cũ | Hệ thống trong môi trường mới; **chuyển đổi dữ liệu**: mọi bản ghi đến nơi đầy đủ và đúng |
| **Retirement** (ngừng sử dụng) | Tắt một ứng dụng cũ đang giữ dữ liệu nhiều năm | **Lưu trữ dữ liệu** (archiving); nếu dữ liệu phải giữ nhiều năm, cả việc **khôi phục và truy xuất** từ kho lưu trữ |

Ví dụ một test migration: dữ liệu khách hàng chuyển từ cửa hàng cũ sang cửa hàng mới. So sánh số lượng bản ghi, kiểm tra tên có dấu, địa chỉ cũ và đơn hàng có giảm giá đến nơi nguyên vẹn, và kiểm tra khách hàng đăng nhập được bằng mật khẩu cũ (hoặc được yêu cầu đặt lại, như đã thống nhất).

## Test bao nhiêu: impact analysis

Phạm vi maintenance testing phụ thuộc vào ba điều:

* **rủi ro** của thay đổi (sửa phần thanh toán rủi ro hơn sửa chữ ở footer),
* **kích thước của hệ thống hiện có**,
* **kích thước của thay đổi**.

**Impact analysis** (phân tích ảnh hưởng) tìm ra những phần nào của hệ thống có thể bị một thay đổi tác động. Nó cũng được làm **trước** khi thay đổi: biết trước hậu quả giúp nhóm quyết định thay đổi đó có đáng làm không. Đầu vào điển hình:

* code, màn hình, API và bảng database bị thay đổi,
* mọi thứ **dùng** tới chúng (một hàm tính thuế dùng chung ảnh hưởng mọi mức giá trên trang),
* traceability giữa requirement và test (xem bài về testware),
* lịch sử defect của khu vực đó.

Impact analysis khó hơn khi tài liệu đã lỗi thời hoặc thiếu test, điều rất thường gặp ở hệ thống cũ. Khi đó kinh nghiệm và exploratory testing lấp chỗ trống.

## Hot fix: kiểm thử dưới áp lực

Hot fix lên production rất nhanh, nên không có thời gian chạy regression đầy đủ. Mức tối thiểu hợp lý:

1. Tái hiện failure trên phiên bản cũ và xác nhận bản sửa trên phiên bản mới.
2. Chạy **core regression set** cho các luồng quan trọng, tốt nhất là tự động.
3. Chạy test có chủ đích cho các khu vực mà impact analysis chỉ ra.
4. Sau khi release, theo dõi production và chạy regression rộng hơn trong bản release có kế hoạch tiếp theo.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 2.3 "Maintenance testing". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: maintenance testing kiểm tra các thay đổi trên một hệ thống đang được sử dụng: bản thân thay đổi cộng với regression những gì không đổi. Nó được kích hoạt bởi sửa đổi, migration và ngừng sử dụng, và impact analysis, dựa trên rủi ro và kích thước, quyết định cần test tới đâu.
