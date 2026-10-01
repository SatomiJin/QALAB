Các nguyên tắc này (trong syllabus ISTQB Foundation) giải thích giới hạn của kiểm thử và nên dồn công sức vào đâu.

1. **Kiểm thử cho thấy có defect, không chứng minh là không có defect.** Test pass giúp giảm rủi ro; chúng không chứng minh sản phẩm hết bug.
2. **Không thể kiểm thử toàn bộ.** Một form có ba trường, mỗi trường 100 giá trị, đã có một triệu tổ hợp. Hãy chọn test bằng kỹ thuật và theo rủi ro.
3. **Kiểm thử sớm tiết kiệm thời gian và tiền bạc.** Review requirement và thiết kế, không chỉ phần mềm đang chạy.
4. **Defect thường tập trung thành cụm.** Một vài module thường chứa phần lớn defect. Khi tìm thấy bug ở một khu vực, hãy soi kỹ hơn ở đó.
5. **Test bị "nhờn" (nghịch lý thuốc trừ sâu).** Chạy đi chạy lại cùng một bộ test sẽ tìm được ít defect mới hơn. Hãy review và bổ sung chúng.
6. **Kiểm thử phụ thuộc bối cảnh.** Ứng dụng ngân hàng và một trò chơi không được test theo cùng một cách.
7. **"Không có lỗi" là một ngộ nhận.** Một hệ thống không còn defect nào đã biết vẫn có thể vô dụng nếu không đáp ứng nhu cầu người dùng.

## Áp dụng trong công việc

Khi ai đó hỏi "đã test hết chưa?", nguyên tắc 1 và 2 cho câu trả lời trung thực: *"Đây là những rủi ro đã được cover, đây là những rủi ro chưa, và đây là những gì chúng tôi tìm thấy."*
