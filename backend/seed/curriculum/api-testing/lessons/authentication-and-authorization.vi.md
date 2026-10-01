Phần lớn API chứa dữ liệu không phải ai cũng được xem hay sửa. Hai câu hỏi bảo vệ dữ liệu đó: **bạn là ai?** (authentication — xác thực) và **bạn được phép làm gì?** (authorization — phân quyền). Bug về kiểm soát truy cập thuộc loại nghiêm trọng nhất của một API, vì giao diện không che giấu được gì trước người gọi thẳng vào API. Và việc của tester chính là gọi thẳng vào API.

## Authentication và authorization

| | Authentication (authn) | Authorization (authz) |
|---|---|---|
| Câu hỏi | Bạn là ai? | Bạn có được làm việc này không? |
| Kiểm tra bằng | Mật khẩu, token, API key | Role, quyền sở hữu, permission |
| Thất bại trả về | `401 Unauthorized` | `403 Forbidden` (hoặc `404`) |
| Ví dụ | Không có token, token hết hạn | Learner gọi endpoint của admin |

Cái tên `401 Unauthorized` là di sản lịch sử và dễ gây nhầm: thực chất nó nghĩa là *chưa xác thực*.

## Bearer token và JWT

Sau khi đăng nhập, API cấp cho client một **access token**. Client gửi nó kèm mọi request:

```http
GET /api/v1/courses HTTP/1.1
Authorization: Bearer eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiI5YjF...
```

Nhiều API dùng **JWT** (JSON Web Token): ba phần Base64 cách nhau bởi dấu chấm: header, payload (các claim như `sub` là id người dùng, `exp` là thời điểm hết hạn) và chữ ký (signature). Payload chỉ được mã hóa Base64, không được mã hóa bí mật: ai cũng đọc được trên jwt.io. **Signature** mới là thứ ngăn người khác sửa nó. Từ đó suy ra các test:

* Không có header `Authorization` → `401`.
* `Bearer` kèm chuỗi rác, hoặc token bị đổi một ký tự (sai signature) → `401`.
* Token đã hết hạn → `401`. Khi đó client refresh hoặc đăng nhập lại.
* Token của một phiên đã logout → `401` nếu API thu hồi phiên.
* Token không bao giờ được xuất hiện trong URL, trong log hay trong thông báo lỗi.

Access token có thời hạn ngắn. **Refresh token** dùng để lấy token mới; nếu refresh token được xoay vòng (rotate), một refresh token cũ dùng lần thứ hai phải bị từ chối.

## Test authorization

Authentication chứng minh danh tính; nó không quyết định quyền truy cập. Với mỗi endpoint, hãy hỏi: *user nào được gọi nó, trên dữ liệu nào?*

**Role.** Gọi endpoint của admin bằng token của learner: kết quả phải là `403`, lần nào cũng vậy, với mọi method. Kiểm tra cả việc dữ liệu có bị đụng tới không: một `PATCH` trả `403` nhưng vẫn lưu thay đổi là bug.

**Quyền sở hữu (dữ liệu của user khác).** Đây là bug API nghiêm trọng hay gặp nhất, gọi là **IDOR** (Insecure Direct Object Reference) hoặc **BOLA** (Broken Object Level Authorization). Test này cần **hai tài khoản**:

1. User A tạo một thứ riêng tư (một đơn hàng, một bài làm, một ghi chú trong profile) và ghi lại id của nó.
2. User B, dùng token **của B**, gọi `GET`, `PATCH` và `DELETE` lên id của A.
3. Mong đợi: `403` hoặc `404`. Không bao giờ là `200` kèm dữ liệu của A.

`404` thường là câu trả lời tốt hơn: `403` xác nhận rằng resource đó có tồn tại. API của QA Learning Lab trả `404` cho nội dung mà learner không được xem, bất kể lý do là gì.

**Không tin bất cứ thứ gì từ client.** Id người dùng lấy từ token đã được xác minh, không lấy từ body. Thử gửi `"userId"`, `"role": "admin"` hoặc `"score"` trong body: một API an toàn sẽ từ chối request (`400`) hoặc bỏ qua field đó. Nó không bao giờ được biến bạn thành admin hay cho bạn tự đặt điểm của mình.

## Một test plan về auth tốt cần bao phủ gì

| Khía cạnh | Test |
|---|---|
| Token thiếu / sai / hết hạn | `401` trên mọi endpoint được bảo vệ |
| Endpoint công khai | Chạy được khi không có token (`GET /api/v1/health`, đăng nhập) |
| Role | Token learner gọi route admin → `403` |
| Quyền sở hữu | User B gọi id của user A → `403` / `404` |
| Field trong body | Client không đặt được `role`, `userId`, `score` |
| Response | Không có password hash, token hay dữ liệu của user khác |

## Tự thử

Trong API của QA Learning Lab, mọi endpoint trừ `GET /api/v1/health` và các endpoint `/auth/*` công khai đều cần Bearer token. Trong Swagger UI (`/api/docs`), gọi `GET /api/v1/courses` khi chưa authorize, rồi với một token hợp lệ, rồi với chính token đó nhưng đổi ký tự cuối cùng. Bạn sẽ thấy `401`, `200`, `401`.

> Ý chính: `401` = không biết bạn là ai; `403` = biết, nhưng không cho. Luôn test với hai user: những bug gây hại nhất là một user đọc hoặc sửa được dữ liệu của user khác.
