API (Application Programming Interface) là cách một chương trình yêu cầu chương trình khác cung cấp dữ liệu hoặc thực hiện một hành động. Phần lớn web API dùng **HTTP**: client gửi một **request**, server trả về một **response**. Test API nghĩa là chủ động gửi request, cả request đúng lẫn request sai, rồi kiểm tra từng phần của response. Bạn không cần giao diện để làm việc này, nên API test chạy nhanh và tìm ra bug sớm.

## Cấu trúc của một request

Mọi HTTP request đều có cùng các phần:

| Phần | Ví dụ | Ý nghĩa |
|---|---|---|
| Method | `GET` | Bạn muốn làm gì |
| URL | `https://api.example.com/api/v1/courses?page=2` | Resource nào (path) và tùy chọn gì (query string) |
| Header | `Authorization: Bearer eyJ...`, `Accept: application/json` | Metadata: bạn là ai, muốn nhận định dạng nào |
| Body | `{"title": "API testing"}` | Dữ liệu bạn gửi (thường dùng với `POST`, `PUT`, `PATCH`) |

Response có **status code** (`200`, `404`…), header và thường có body. Các bài sau sẽ đi vào từng phần.

## Các method chính

| Method | Mục đích | Thành công thường trả về |
|---|---|---|
| `GET` | Đọc một resource hoặc một danh sách | `200 OK` |
| `POST` | Tạo resource hoặc kích hoạt một hành động | `201 Created` (hoặc `200`) |
| `PUT` | Thay thế toàn bộ một resource | `200 OK` |
| `PATCH` | Sửa một vài field của resource | `200 OK` |
| `DELETE` | Xóa một resource | `204 No Content` (hoặc `200`) |

`PUT` và `PATCH` hay bị nhầm. `PUT /notes/7` với `{"title": "New"}` nghĩa là "note 7 bây giờ đúng y như thế này": những field bạn không gửi có thể bị xóa trắng. `PATCH /notes/7` với cùng body đó nghĩa là "chỉ đổi title". Khi test một `PUT`, hãy kiểm tra chuyện gì xảy ra với các field bạn không gửi.

## Safe và idempotent

Hai tính chất cho biết một method được phép làm gì. Chúng đáng để test, vì client và proxy dựa vào chúng (trình duyệt hoặc app mobile có thể **gửi lại** request sau khi bị timeout).

* **Safe** (an toàn): request không thay đổi gì trên server. `GET` và `HEAD` là safe. Một `GET` mà xóa hay sửa dữ liệu là bug.
* **Idempotent** (lặp lại không đổi kết quả): gửi cùng một request một lần hay mười lần thì trạng thái server vẫn như nhau. `GET`, `HEAD`, `PUT` và `DELETE` là idempotent. Xóa note 7 hai lần thì note 7 vẫn chỉ là đã bị xóa (lần gọi thứ hai có thể trả `404`, nhưng trạng thái không đổi).
* **Không có cả hai**: `POST` không idempotent: hai lần gọi `POST /orders` giống hệt nhau tạo ra hai đơn hàng. `PATCH` không được đảm bảo là idempotent (kiểu thay đổi `{"stock": "+1"}` sẽ cộng dồn).

| Method | Safe | Idempotent |
|---|---|---|
| `GET`, `HEAD` | Có | Có |
| `PUT`, `DELETE` | Không | Có |
| `POST`, `PATCH` | Không | Không đảm bảo |

Một bug API kinh điển: người dùng bấm đúp nút **Pay**, app gửi `POST /payments` hai lần, và khách bị trừ tiền hai lần. Tester cố tình gửi cùng một request hai lần để tìm ra nó.

## Gửi request bằng curl

`curl` là công cụ dòng lệnh để gửi HTTP request. Postman, Insomnia hay Swagger UI cũng làm điều tương tự qua một form.

```bash
curl -i -X GET "http://localhost:3000/api/v1/health" -H "Accept: application/json"
```

`-i` in ra cả dòng status và các header, không chỉ body. Một `POST` thêm body và định dạng của body:

```bash
curl -i -X POST "https://api.example.com/api/notes" -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"title": "Buy milk"}'
```

## Tự thử

Backend của QA Learning Lab là một API thật mà bạn có thể test. Base path là `/api/v1`, và **Swagger UI** ở `/api/docs` liệt kê mọi endpoint cùng method, parameter và response. `GET /api/v1/health` không cần đăng nhập: gọi nó bằng curl rồi đọc status code và header. Sau đó mở Swagger, tìm `GET /api/v1/courses` và ghi lại method mà mỗi endpoint liên quan đến course sử dụng.

## Nguồn tham khảo

* [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) (IETF, June 2022), mục 9 "Methods" (9.2.1 safe methods, 9.2.2 idempotent methods). Phần giải thích và ví dụ do team QALAB tự biên soạn.

> Ý chính: request = method + URL + header + body. Hiểu mỗi method hứa hẹn điều gì (safe, idempotent) và test xem API có giữ lời hứa đó không.
