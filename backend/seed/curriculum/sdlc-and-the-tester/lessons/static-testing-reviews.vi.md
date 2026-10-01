**Static testing** (kiểm thử tĩnh) tìm defect mà không cần chạy phần mềm: con người đọc và thảo luận về một sản phẩm công việc, hoặc công cụ phân tích nó. **Dynamic testing** (kiểm thử động) chạy phần mềm và quan sát nó hoạt động. Static testing có thể bắt đầu ngay ngày đầu tiên, trước khi có dòng code nào, nên đây là nơi rẻ nhất để bắt được một defect.

## Những gì có thể static test

Gần như mọi thứ nhóm viết ra đều có thể được review:

* Requirement, user story và acceptance criteria.
* Thiết kế, đặc tả API, schema database.
* Source code và cấu hình.
* Test plan, test case và test data.
* Hướng dẫn sử dụng và nội dung trợ giúp.

Static testing và dynamic testing tìm ra những thứ khác nhau. Một buổi review có thể phát hiện requirement bị thiếu, mâu thuẫn hay một câu không thể test được, những vấn đề mà không lần chạy test nào cho thấy được vì không có gì để đối chiếu. Dynamic testing tìm ra các failure chỉ xuất hiện khi code chạy, như trang bị chậm hay crash với dữ liệu thật.

## Các loại review

Review trải dài từ không chính thức đến rất chính thức.

| Loại | Ai dẫn dắt | Mức độ chính thức | Mục đích chính |
|---|---|---|---|
| Informal review | Bất kỳ ai (ví dụ làm cặp, nhờ đồng nghiệp xem qua) | Không có quy trình, không ghi chép | Phản hồi nhanh |
| Walkthrough | Chính tác giả | Thấp đến trung bình | Tác giả trình bày sản phẩm, chia sẻ hiểu biết, thu thập ý tưởng |
| Technical review | Moderator đã được đào tạo hoặc technical lead | Trung bình | Đồng nghiệp đi đến đồng thuận về chất lượng kỹ thuật và các phương án |
| Inspection | Moderator đã được đào tạo | Cao: vai trò rõ ràng, checklist, entry và exit criteria, số liệu đo | Tìm càng nhiều defect càng tốt, đo lường và cải tiến quy trình |

Review một pull request thường là informal review hoặc technical review. Dù là loại nào, hãy nhận xét về sản phẩm, không nhận xét về con người, và ghi lại những gì tìm được để chúng được sửa.

## Static analysis

**Static analysis** là static testing do công cụ thực hiện. Linter, type checker và công cụ quét bảo mật đọc code mà không chạy nó và báo các defect có khả năng xảy ra:

```text
checkout.ts:42  warning  'discount' is assigned but never used
checkout.ts:57  error    Possible null value: 'basket.items' may be undefined
```

Công cụ nhanh và không biết mệt với các quy tắc về code; còn con người cần thiết cho phần ý nghĩa: code có làm đúng điều requirement muốn hay không.

## Review requirement để đánh giá khả năng test

Buổi review có giá trị nhất với tester là review requirement, trước khi bắt đầu phát triển. Đọc từng story và tự hỏi: *mình có viết được một test pass hoặc fail rõ ràng không?* Hãy tìm:

* **Từ ngữ mơ hồ**: "nhanh", "thân thiện", "an toàn", "khoảng", "v.v." Hãy hỏi một con số hoặc một ví dụ.
* **Case bị thiếu**: chuyện gì xảy ra khi input trống, input sai, không có quyền, mất kết nối?
* **Quy tắc chưa định nghĩa**: giới hạn, định dạng, cách làm tròn, múi giờ.
* **Mâu thuẫn** với story khác hoặc với hành vi hiện tại.
* **Acceptance criteria không test được hoặc bị thiếu**.

## Ví dụ cụ thể: review một user story

```text
As a user, I want to upload a profile picture
so that others can recognise me.
Acceptance criteria:
- The picture uploads quickly.
- Large files are not allowed.
- The picture is shown everywhere.
```

Ghi chú review của tester:

| # | Nội dung | Vấn đề | Câu hỏi cho Product Owner |
|---|---|---|---|
| 1 | "uploads quickly" | Mơ hồ, không đo được | Trong bao nhiêu giây, với file kích thước nào và mạng nào? |
| 2 | "Large files" | Giới hạn chưa định nghĩa | Kích thước tối đa là bao nhiêu: 2 MB, 5 MB? Giới hạn có tính cả giá trị biên không? |
| 3 | (thiếu) | Không nêu định dạng | Những định dạng nào: JPG, PNG, GIF, HEIC? Còn một file .exe bị đổi tên thì sao? |
| 4 | (thiếu) | Không có hành vi khi lỗi | Người dùng thấy thông báo gì khi file quá lớn hoặc sai định dạng? |
| 5 | "shown everywhere" | Phạm vi mơ hồ | Chính xác là những màn hình nào: profile, bình luận, header? |
| 6 | (thiếu) | Thay và xoá ảnh | Người dùng có đổi hoặc xoá ảnh được không? |
| 7 | "As a user" | Vai trò không rõ | Chỉ người dùng đã đăng nhập? Ảnh có được kiểm duyệt không? |

Bảy defect hoặc câu hỏi, tìm ra trong mười phút, chưa cần viết dòng code nào. Mỗi câu trả lời trở thành một acceptance criterion và sau này là một test case: boundary value cho giới hạn kích thước, định dạng không hợp lệ, thông báo lỗi.

> Ý chính: static testing tìm defect bằng cách xem xét sản phẩm công việc thay vì chạy chúng. Review trải dài từ kiểm tra không chính thức đến inspection chính thức, công cụ thực hiện static analysis trên code, và review requirement để tìm chỗ mơ hồ và case bị thiếu là nơi tester ngăn được nhiều defect nhất với chi phí thấp nhất.
