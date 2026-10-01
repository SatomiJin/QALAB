Kiểm thử phần mềm là công việc **tìm hiểu sản phẩm thực sự hoạt động ra sao** rồi so sánh với cách nó phải hoạt động, để cả nhóm quyết định được sản phẩm đã sẵn sàng hay chưa.

## Kiểm thử là để có thông tin

Tester không "làm cho phần mềm tốt lên". Tester tạo ra thông tin:

* cái gì chạy đúng như mong đợi,
* cái gì không đúng, và nghiêm trọng đến mức nào,
* cái gì chưa được kiểm tra.

Cả nhóm (product owner, developer và bạn) dùng thông tin đó để quyết định: release, sửa trước, hay chấp nhận rủi ro.

## Vì sao đáng bỏ công

| Phát hiện ở giai đoạn | Chi phí sửa thường gặp |
|---|---|
| Review requirement | Vài phút: sửa một câu |
| Phát triển | Vài giờ: sửa đoạn code vừa viết |
| Kiểm thử | Vài giờ đến vài ngày: sửa, build lại, test lại |
| Production | Vài ngày, cộng thêm hỗ trợ khách hàng, sửa dữ liệu và uy tín |

Phát hiện vấn đề càng muộn thì càng tốn kém. Vì vậy kiểm thử bắt đầu **trước** khi có code: review requirement cũng là kiểm thử.

## Verification và validation

* **Verification**: ta có đang làm sản phẩm đúng cách không? (Nó có khớp với đặc tả không?)
* **Validation**: ta có đang làm đúng sản phẩm không? (Nó có giải quyết được vấn đề của người dùng không?)

Một tính năng có thể qua verification mà vẫn trượt validation: nó khớp đặc tả, nhưng đặc tả lại sai.

> Ý chính: kiểm thử giảm rủi ro hỏng hóc khi sử dụng. Nó không chứng minh được là không còn defect.
