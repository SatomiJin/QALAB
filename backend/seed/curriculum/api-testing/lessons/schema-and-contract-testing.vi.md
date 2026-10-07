Một API có các client: web frontend, app mobile, các service khác. Chúng được viết dựa trên một thỏa thuận về hình dạng của request và nội dung của response. Thỏa thuận đó là **contract** (hợp đồng). Schema validation kiểm tra một response có tuân theo nó không; contract testing kiểm tra bên cung cấp API và các bên sử dụng có còn thống nhất với nhau không. Cả hai bắt được loại bug "API vẫn chạy" nhưng app lại hỏng.

## JSON Schema

**JSON Schema** mô tả hình dạng của một tài liệu JSON: có những field nào, kiểu gì, field nào bắt buộc và giới hạn của chúng.

```json
{
  "type": "object",
  "required": ["items", "total", "page", "pageSize"],
  "additionalProperties": false,
  "properties": {
    "items": { "type": "array" },
    "total": { "type": "integer", "minimum": 0 },
    "page": { "type": "integer", "minimum": 1 },
    "pageSize": { "type": "integer", "enum": [20, 50, 100] }
  }
}
```

Validate mọi response theo schema của nó sẽ bắt được những thứ mà nhìn lướt bỏ sót: `total` bị gửi dưới dạng chuỗi `"45"`, một field bỗng thành `null`, một field bị đổi tên, một field thừa làm lộ dữ liệu (`additionalProperties: false` sẽ báo ra). Các công cụ test như Postman, Playwright, REST Assured hay Ajv có thể validate schema chỉ với một dòng trong mỗi test.

## OpenAPI

**OpenAPI** (trước đây gọi là Swagger) mô tả toàn bộ API trong một file: mọi endpoint, method, parameter, request body, response và status code, kèm JSON Schema cho các body. Nó đóng vai trò:

* **Tài liệu**: Swagger UI hiển thị nó thành một trang tương tác. API của QA Learning Lab phục vụ nó tại `/api/docs`.
* **Test oracle** (căn cứ để biết kết quả đúng): điều spec ghi là kết quả mong đợi. Response khác spec thì hoặc là bug của API, hoặc là bug của spec, và cả hai đều đáng báo cáo.
* **Nguồn sinh test**: các công cụ có thể sinh request từ spec, kể cả request không hợp lệ.

Khi test một endpoint, hãy so với spec: `POST` có thật sự trả `201` như tài liệu ghi không? Mọi error code trong tài liệu (`400`, `401`, `404`, `409`) có xảy ra được và đúng cấu trúc như đã ghi không? Một field có trong tài liệu có thật sự được trả về không?

## Contract testing

Trong một hệ thống nhiều service, end-to-end test cho tất cả cùng lúc vừa chậm vừa dễ vỡ. **Contract test** kiểm tra riêng từng bên theo một contract chung.

**Consumer-driven contract** (ý tưởng đằng sau các công cụ như Pact):

1. **Consumer** (bên sử dụng, ví dụ app mobile) ghi lại những gì nó dùng: "`GET /courses` trả về `items[].id` (string), `items[].title` (string) và `total` (integer)".
2. **Provider** (bên cung cấp, tức API) chạy những kỳ vọng này trong pipeline của chính nó.
3. Nếu một thay đổi ở API phá vỡ một kỳ vọng, build của provider fail **trước khi** release, và team biết chính xác consumer nào sẽ bị hỏng.

Consumer chỉ liệt kê những gì nó thực sự dùng, nên provider vẫn được tự do thay đổi phần còn lại.

## Điều gì phá vỡ contract

| Thay đổi | Breaking? | Vì sao |
|---|---|---|
| Đổi tên một field trong response (`title` → `name`) | Có | Client đọc `title` và không nhận được gì |
| Xóa một field trong response | Có | Như trên |
| Đổi kiểu (`total`: số → chuỗi) | Có | Code client làm phép tính sẽ lỗi |
| Biến một field tùy chọn trong request thành bắt buộc | Có | Client cũ không gửi field đó và nhận `400` |
| Đổi status code (`201` → `200`) | Có | Client kiểm tra `201` sẽ lỗi |
| Thêm một field tùy chọn mới vào response | Không | Client bỏ qua những gì nó không đọc |
| Thêm một endpoint mới | Không | Chưa ai dùng nó |
| Thêm một field tùy chọn vào request | Thường là không | Client cũ chỉ đơn giản là không gửi |

Cẩn thận: thêm field chỉ an toàn với client biết bỏ qua field lạ. Và thêm một giá trị mới vào enum (một `status` mới) có thể làm hỏng client chỉ xử lý các giá trị đã biết. Khi bắt buộc phải có breaking change, API thêm một version mới (`/api/v2`) và giữ version cũ thêm một thời gian; đó là lý do API của QA Learning Lab nằm dưới `/api/v1`.

## Tự thử

Mở `/api/docs` trên API của QA Learning Lab, chọn `GET /api/v1/courses` và đọc response schema trong Swagger UI. Gọi endpoint đó và so sánh từng field của response thật với schema: tên, kiểu, field bắt buộc, và mọi thứ thừa ra.

## Nguồn tham khảo

* [JSON Schema specification](https://json-schema.org/specification), dialect hiện hành 2020-12.
* [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) (mới nhất: 3.2.1, tháng 9/2026), giấy phép Apache License 2.0. Contract testing được mô tả như cách làm phổ biến. Phần giải thích và ví dụ do team QALAB tự biên soạn.

> Ý chính: contract là thứ mà client dựa vào. Validate response theo schema, so sánh hành vi với spec, và coi việc đổi tên, xóa hay đổi kiểu field là breaking change.
