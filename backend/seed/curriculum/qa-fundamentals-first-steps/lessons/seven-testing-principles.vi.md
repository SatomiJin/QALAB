Bảy nguyên tắc này (theo syllabus ISTQB Foundation Level v4.0.1) giải thích giới hạn của kiểm thử và nên dồn công sức vào đâu.

1. **Kiểm thử cho thấy có defect, không chứng minh là không có defect.** Test pass giúp giảm khả năng còn sót defect; chúng không chứng minh sản phẩm hết bug.
2. **Không thể kiểm thử toàn bộ.** Một form có ba trường, mỗi trường 100 giá trị, đã có một triệu tổ hợp. Hãy khoanh vùng bằng kỹ thuật thiết kế test, ưu tiên test case và risk-based testing.
3. **Kiểm thử sớm tiết kiệm thời gian và tiền bạc.** Defect được gỡ khỏi requirement sẽ không lọt vào thiết kế, code và test dựng trên nó. Hãy bắt đầu static testing (review) và dynamic testing sớm nhất có thể.
4. **Defect thường tập trung thành cụm.** Một vài thành phần thường chứa phần lớn defect, hoặc gây ra phần lớn failure trên production (nguyên lý Pareto). Khi tìm thấy bug ở một khu vực, hãy soi kỹ hơn ở đó; các cụm đã biết là đầu vào cho risk-based testing.
5. **Test bị "nhờn" (tests wear out).** Lặp lại cùng một bộ test sẽ tìm được ngày càng ít defect mới (sách cũ gọi là *nghịch lý thuốc trừ sâu*). Hãy đổi test data, thêm test mới. Việc lặp lại vẫn có giá trị trong automated regression testing, nơi mục tiêu là bắt cái bị hỏng chứ không phải tìm bug mới.
6. **Kiểm thử phụ thuộc bối cảnh.** Không có một cách test đúng cho mọi trường hợp. Ứng dụng ngân hàng và một trò chơi không được test theo cùng một cách.
7. **Ngộ nhận "không còn defect" (absence-of-defects fallacy).** Test hết mọi requirement và sửa hết mọi defect vẫn có thể tạo ra một hệ thống người dùng không cần, hoặc thua đối thủ. Verification là chưa đủ; cần cả validation.

## Áp dụng trong công việc

Khi ai đó hỏi "đã test hết chưa?", nguyên tắc 1 và 2 cho câu trả lời trung thực: *"Đây là những rủi ro đã được cover, đây là những rủi ro chưa, và đây là những gì chúng tôi tìm thấy."*

Nguyên tắc 3 là lý do để bạn xin xem user story sớm. Nguyên tắc 4 và 5 nhắc bạn cập nhật chỗ cần soi và bộ test cần chạy. Nguyên tắc 7 nhắc bạn kiểm tra sản phẩm với cách dùng thực tế trong đầu, không chỉ so với đặc tả.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.3 "Testing principles". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Tên các nguyên tắc theo syllabus; phần giải thích và ví dụ do team QALAB tự biên soạn.
