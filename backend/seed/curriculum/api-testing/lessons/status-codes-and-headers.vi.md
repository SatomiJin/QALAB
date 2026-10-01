**Status code** là thứ đầu tiên cần kiểm tra trong mọi API response. Đó là một số có ba chữ số cho client biết chuyện gì đã xảy ra, trước khi ai đó đọc đến body. Status code sai là một bug thật kể cả khi body trông có vẻ đúng: frontend, app mobile và hệ thống monitoring đều ra quyết định dựa trên nó.

## Năm nhóm status code

| Khoảng | Ý nghĩa | Lỗi của ai |
|---|---|---|
| `1xx` | Thông tin (hiếm gặp khi test) | – |
| `2xx` | Thành công | – |
| `3xx` | Chuyển hướng: hãy tìm ở chỗ khác | – |
| `4xx` | Lỗi phía client: request bị sai | Bên gọi phải sửa request |
| `5xx` | Lỗi phía server: server gặp sự cố | Team server phải sửa |

Quy tắc quan trọng nhất với tester: **một request mà client có thể gửi sai thì không bao giờ được dẫn đến `5xx`**. JSON không hợp lệ, thiếu field, hay gửi chữ ở chỗ cần số đều là lỗi của client, nên câu trả lời phải là `4xx` kèm thông báo rõ ràng. Gặp `500` ở đây nghĩa là server không validate dữ liệu đầu vào.

## Những code bạn sẽ gặp nhiều nhất

| Code | Tên | Trường hợp thường gặp |
|---|---|---|
| `200` | OK | `GET` hoặc `PATCH` thành công; body chứa kết quả |
| `201` | Created | `POST` đã tạo resource; thường kèm header `Location` |
| `204` | No Content | Thành công nhưng không có body, ví dụ `DELETE` hoặc logout |
| `301` / `304` | Moved Permanently / Not Modified | Chuyển hướng; bản cache vẫn còn dùng được |
| `400` | Bad Request | Dữ liệu không hợp lệ: sai kiểu, thiếu field, field lạ |
| `401` | Unauthorized | Không có token, hoặc token sai hay hết hạn: "bạn là ai?" |
| `403` | Forbidden | Token hợp lệ, nhưng user này không được làm việc này: "tôi biết bạn, và không được" |
| `404` | Not Found | Resource không tồn tại (hoặc bạn không được biết là nó tồn tại) |
| `409` | Conflict | Xung đột với trạng thái hiện tại: email hoặc slug bị trùng |
| `422` | Unprocessable Content | Đúng cú pháp nhưng sai về nghĩa (vài API dùng thay cho `400`) |
| `429` | Too Many Requests | Chạm rate limit; thường kèm `Retry-After` |
| `500` | Internal Server Error | Sự cố không lường trước trên server |

`400` hay `422`: cả hai đều nghĩa là "dữ liệu của bạn sai". Một API nên chọn một quy ước và dùng thống nhất; trộn lẫn hai cái là đáng để viết bug report. API của QA Learning Lab dùng `400` cho mọi lỗi validation.

## Những header quan trọng khi test

Header là các dòng `Name: value` trên request và response.

| Header | Chiều | Cần kiểm tra gì |
|---|---|---|
| `Content-Type` | Cả hai | Định dạng của body. Response JSON phải ghi `application/json`; request JSON cũng phải gửi header này, nếu không server có thể không đọc được body |
| `Accept` | Request | Định dạng client muốn nhận về |
| `Authorization` | Request | Thông tin xác thực, thường là `Bearer <token>` |
| `Cache-Control`, `ETag` | Response | Response có được cache hay không. Dữ liệu riêng tư (profile, dashboard) không được để cache dùng chung lưu lại |
| `Location` | Response | Resource vừa tạo nằm ở đâu (đi kèm `201`) |
| `Retry-After` | Response | Phải chờ bao lâu sau khi nhận `429` |

Một response điển hình, in ra bằng `curl -i`:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"statusCode": 404, "error": "Not Found", "message": "Course not found"}
```

## Kiểm tra (assert) một response thế nào

1. **Status code** trước tiên: đúng chính xác code mong đợi, không phải "2xx nào cũng được".
2. **Header**: `Content-Type`, và các header đặc thù của trường hợp đó (`Location`, `Retry-After`, cache).
3. **Body**: dữ liệu (bài sau) hoặc, với lỗi, cấu trúc lỗi và một thông báo hữu ích.

Một response lỗi mà dòng status ghi `200` còn body ghi `{"error": "Not found"}` là bug: client chỉ kiểm tra status sẽ tưởng là thành công.

## Tự thử

Gọi `GET /api/v1/courses` trên API của QA Learning Lab mà không có header `Authorization` và ghi lại status code (mọi endpoint, trừ `GET /api/v1/health` và các endpoint `/auth/*` công khai, đều cần Bearer token). Sau đó gọi lại với token lấy từ Swagger UI (`/api/docs`, nút **Authorize**). So sánh status code và `Content-Type` của hai response.

> Ý chính: kiểm tra status code chính xác, rồi đến header, rồi đến body. Lỗi của client là `4xx`; trả `5xx` cho dữ liệu sai là bug.
