Một test happy path chứng minh API chạy đúng khi mọi thứ đều đúng. Nhưng client thật cũng gửi những thứ sai: app phiên bản cũ, gõ nhầm, script, kẻ tấn công. **Negative test** cố tình gửi dữ liệu không hợp lệ; **boundary test** thăm dò hai mép của mọi giới hạn. Kết hợp lại, chúng tìm ra phần lớn bug API, và với API thì làm việc này rất rẻ: không có giao diện nào ngăn bạn gửi `"age": "abc"`.

## Một API tốt xử lý dữ liệu sai thế nào

1. Từ chối với status **4xx** (thường là `400`), không bao giờ là `5xx`.
2. Giải thích bằng một **cấu trúc lỗi nhất quán**, có nêu tên field.
3. **Không thay đổi gì**: không có bản ghi tạo dở, không có cập nhật một nửa.
4. Không để lộ gì bên trong: không stack trace, không SQL, không đường dẫn file.

Ví dụ, API của QA Learning Lab luôn trả lỗi theo dạng:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "slug", "message": "slug must match ^[a-z0-9]+(-[a-z0-9]+)*$" }]
}
```

Test cần assert status, cấu trúc (`statusCode`, `error`, `message`, `details`) và việc `details` nêu đúng field.

## Ý tưởng cho negative test

Lấy một endpoint bất kỳ có body, ví dụ `POST /api/notes` với `title` (chuỗi, bắt buộc, 1–100 ký tự) và `priority` (số nguyên 1–5), rồi thử:

| Nhóm | Ví dụ | Mong đợi |
|---|---|---|
| Thiếu field bắt buộc | `{}` hoặc không có `title` | `400`, `details` nêu `title` |
| Sai kiểu | `"priority": "high"`, `"title": 42` | `400` |
| `null` | `"title": null` | `400` |
| Rỗng hoặc toàn khoảng trắng | `"title": ""`, `"title": "   "` | `400` (nếu không cho phép rỗng) |
| Field lạ | `"colour": "red"` | `400` với API chặt chẽ (API của QA Learning Lab) hoặc bị bỏ qua |
| Field được bảo vệ | `"id"`, `"userId"`, `"createdAt"` | `400` hoặc bị bỏ qua, không bao giờ được áp dụng |
| JSON hỏng | `{"title": "Buy milk",` | `400` |
| Sai `Content-Type` | Body dạng `text/plain` | `400` hoặc `415` |
| Id trong path không hợp lệ | `/api/notes/abc` | `400` (không phải UUID) |
| Id không tồn tại | Một UUID hợp lệ nhưng không có thật | `404` |

Id không hợp lệ đáng có test riêng: `abc`, `123`, một UUID thiếu một ký tự, và `00000000-0000-0000-0000-000000000000`. API của QA Learning Lab trả `400` cho mọi thứ không phải UUID và `404` cho UUID hợp lệ mà nó không biết.

## Boundary test

Mỗi giới hạn có hai phía. Với `title` 1–100 ký tự, test **0, 1, 100 và 101**; với `priority` 1–5, test **0, 1, 5 và 6**, thêm cả `-1`, `2.5` và một số rất lớn. Với pagination, `pageSize` chỉ nhận 20, 50 và 100, nên `19`, `21` và `0` phải bị từ chối.

Hãy để ý kỹ các giá trị biên của chuỗi:

* Đếm với chữ không phải ASCII: 100 ký tự `ế` hay emoji vẫn là 100 ký tự, nhưng nhiều byte hơn.
* Khoảng trắng đầu và cuối: API có trim trước khi đếm không?
* Dữ liệu rất dài (10 000 ký tự, body 2 MB): API nên trả `400` hoặc `413`, không được bị timeout.

## Sau request: có gì bị thay đổi không?

Nhận `400` mới là một nửa việc kiểm tra. Hãy đọc lại dữ liệu: sau một `POST` bị từ chối, không có note nào được tạo (`GET` danh sách, so sánh `total`); sau một `PATCH` bị từ chối, resource giữ nguyên như cũ. "Trả lỗi **nhưng vẫn** lưu một phần dữ liệu" là một bug có thật và rất khó chịu.

## Thông báo lỗi

Kiểm tra rằng thông báo giúp được client nhưng không giúp kẻ tấn công. `"title must be at most 100 characters"` là tốt. `"duplicate key value violates unique constraint notes_slug_key"` hay một stack trace Java là bug: nó làm lộ database và code. Lỗi đăng nhập không được tiết lộ một email có tồn tại hay không.

## Tự thử

Trên API của QA Learning Lab, gọi `GET /api/v1/courses?pageSize=21`, rồi `?page=0`, rồi `?page=abc`. Mỗi lần phải là `400` với cấu trúc lỗi như trên. Sau đó gọi `GET /api/v1/lessons/abc` và `GET /api/v1/lessons/00000000-0000-0000-0000-000000000000`, rồi so sánh `400` với `404`.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 4.2.1 "Equivalence partitioning" và 4.2.2 "Boundary value analysis". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus.
* [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) (IETF, June 2022), mục 15.5 "Client error 4xx". Phần giải thích và ví dụ do team QALAB tự biên soạn.

> Ý chính: với mỗi field, thử thiếu, sai kiểu, rỗng, quá nhỏ, quá lớn và field lạ. Mong đợi `4xx` kèm lỗi rõ ràng, và kiểm tra rằng không có gì được lưu.
