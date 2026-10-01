Một request có thể mang dữ liệu ở bốn chỗ: path, query string, header và body. Mỗi chỗ có quy tắc riêng, và chỗ nào cũng có thể khiến API sai. Biết một giá trị thuộc về đâu giúp bạn thiết kế test và đọc tài liệu API.

## Path parameter

**Path parameter** xác định một resource cụ thể. Nó là một phần của path trong URL:

```http
GET /api/v1/lessons/3f2b8c1e-5a7d-4e2b-9c1a-0d6e8f4a2b17
```

Ở đây id của lesson là một UUID. (Vài API dùng **slug** dễ đọc thay cho id, như `/api/v1/courses/api-testing`.) Các test thường gặp: id hợp lệ và có tồn tại (`200`), id hợp lệ nhưng không tồn tại (`404`), và một giá trị hoàn toàn không phải UUID như `abc` hay `123` (`400`, không phải `500`).

## Query parameter

**Query parameter** đứng sau dấu `?` và nối với nhau bằng `&`. Chúng thay đổi *cách* resource được trả về: lọc, sắp xếp, ngôn ngữ, trang.

```http
GET /api/v1/courses?page=2&pageSize=20&lang=vi
```

Những điều cần test: giá trị mặc định khi thiếu parameter, mọi giá trị được phép, một giá trị không được phép (`pageSize=7`), sai kiểu (`page=abc`), và một parameter mà API không biết (`?colour=red`). API chặt chẽ, như API của QA Learning Lab, trả `400` với query parameter lạ; API dễ dãi thì bỏ qua. Cách nào cũng được nếu có ghi trong tài liệu và nhất quán.

## Phân trang (pagination)

Những danh sách có thể dài ra được trả về **từng trang một**. API của QA Learning Lab dùng `page` (bắt đầu từ 1) và `pageSize` (20, 50 hoặc 100, mặc định 20), và mọi response dạng danh sách đều cho biết bạn đang ở đâu:

```json
{
  "items": [{ "id": "3f2b8c1e-5a7d-4e2b-9c1a-0d6e8f4a2b17", "title": "API testing" }],
  "total": 45,
  "page": 3,
  "pageSize": 20
}
```

Với `total` là 45 và `pageSize` là 20 thì có 3 trang, và trang 3 chứa 5 item. Các test cho pagination:

| Test | Kết quả mong đợi |
|---|---|
| Không có parameter | `page` 1, `pageSize` 20 |
| Trang cuối | Chỉ các item còn lại (5) |
| Trang vượt quá cuối (`page=99`) | `200`, `items` rỗng, `total` thật |
| `page=0` hoặc `page=-1` | `400` |
| `pageSize=7` hoặc `pageSize=1000` | `400` (chỉ cho phép 20, 50, 100) |
| Item qua các trang | Không item nào lặp lại, không thiếu item nào |

## Request body

`POST`, `PUT` và `PATCH` thường gửi một **body JSON** kèm `Content-Type: application/json`:

```json
{ "title": "Buy milk", "dueDate": "2026-10-15", "done": false }
```

JSON có kiểu dữ liệu: chuỗi trong dấu nháy, số, `true`/`false`, `null`, mảng `[]`, object `{}`. `"15"` (chuỗi) không phải là `15` (số), và một API tốt sẽ từ chối giá trị sai kiểu. Module sau sẽ test body kỹ hơn.

## Response body: cần kiểm tra gì

Đừng dừng ở mức "có trả về gì đó". Với mỗi response, hãy kiểm tra:

* **Cấu trúc**: có đủ các field trong tài liệu, đúng kiểu (`total` là số, `items` là mảng).
* **Giá trị**: dữ liệu đúng: note bạn vừa tạo có đúng title bạn gửi; bộ lọc chỉ trả về item khớp điều kiện.
* **Không thừa**: không có bí mật (password hash, đáp án, id nội bộ của user khác), không có field mà tài liệu không liệt kê.
* **Nhất quán**: ngày tháng một định dạng (ISO 8601: `2026-10-15T08:30:00Z`), cách đặt tên một kiểu (API của QA Learning Lab dùng camelCase: `pageSize`, `createdAt`).
* **Đi và về (round trip)**: thứ bạn ghi bằng `POST` là thứ bạn đọc lại được bằng `GET`.

Thứ tự key trong JSON không quan trọng: `{"a": 1, "b": 2}` và `{"b": 2, "a": 1}` là cùng một object, nên đừng assert theo thứ tự. Những giá trị đổi sau mỗi lần chạy (id sinh ra, timestamp) thì kiểm tra theo kiểu và định dạng, không theo giá trị chính xác.

## Tự thử

Trong Swagger UI (`/api/docs`), gọi `GET /api/v1/courses` với `pageSize=20`, rồi với `pageSize=7` và với `page=99`. So sánh status code và kiểm tra rằng `total` giữ nguyên trong khi `items` thay đổi. Sau đó thử một parameter lạ như `?sort=title`.

> Ý chính: path = resource nào, query = trả về thế nào, body = dữ liệu. Test mỗi chỗ với giá trị hợp lệ, không hợp lệ và bị thiếu, và kiểm tra toàn bộ response chứ không chỉ việc nó có trả về.
