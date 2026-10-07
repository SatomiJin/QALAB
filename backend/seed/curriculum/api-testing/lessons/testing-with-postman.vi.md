curl rất hợp cho một request. API testing thực tế là hàng chục request, nhiều môi trường và những kiểm tra có thể chạy lại vào ngày mai. **Postman** là công cụ được dùng rộng rãi nhất cho việc đó: bạn sắp request vào collection, đổi môi trường bằng biến, viết kiểm tra bằng JavaScript, và chạy tất cả từ ứng dụng hoặc từ CI.

## Collection, request và environment

| Khái niệm | Là gì | Ví dụ |
|---|---|---|
| **Request** | Một lời gọi HTTP: method, URL, header, body | `POST {{baseUrl}}/orders` |
| **Collection** | Một nhóm request, có thư mục, có thể chia sẻ và chạy cùng nhau | "Shop API" với các thư mục Auth, Orders, Products |
| **Environment** | Một bộ biến cho một đích đến | `local`, `staging` |
| **Variable** | Một giá trị có tên, dùng dạng `{{name}}` trong URL, header, body và script | `{{baseUrl}}`, `{{token}}` |

Biến có **scope** (phạm vi), từ rộng nhất đến hẹp nhất: **global**, **collection**, **environment**, **data** (từ file dữ liệu khi chạy) và **local** (bên trong một script). Khi hai scope cùng định nghĩa một tên, **scope hẹp hơn thắng**: `baseUrl` của environment ghi đè `baseUrl` của collection. Nhờ vậy một collection test được cả local lẫn staging mà không phải sửa request nào.

Mặc định, giá trị biến chỉ nằm **cục bộ** trong Postman của bạn và không được đồng bộ lên cloud. Hãy giữ như vậy với token và mật khẩu; đừng bao giờ đưa secret thật vào giá trị được chia sẻ.

## Script: Pre-request và Post-response

Mỗi request (và mỗi thư mục hay collection) có một tab **Scripts** gồm hai phần:

* **Pre-request**: chạy trước khi gửi request; chuẩn bị dữ liệu, ví dụ một timestamp hay một token.
* **Post-response**: chạy sau khi nhận response; đây là nơi đặt các **test**.

Một test có dạng `pm.test(name, function)`; bên trong, bạn assert bằng `pm.response.to.have…` hoặc `pm.expect(…)` (thư viện assertion Chai có sẵn). Một post-response script cho request tạo đơn hàng:

```js
pm.test('Status is 201 Created', function () {
  pm.response.to.have.status(201);
});

const order = pm.response.json();

pm.test('Order has an id and the right total', function () {
  pm.expect(order.id).to.be.a('string');
  pm.expect(order.total).to.eql(24);
});

pm.test('Responds within 800 ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(800);
});

pm.collectionVariables.set('orderId', order.id);
```

Dòng cuối **nối chuỗi** các request: request tiếp theo, `GET {{baseUrl}}/orders/{{orderId}}`, đọc đơn hàng vừa tạo. Dùng `pm.environment.set` cho giá trị thuộc về một môi trường, chẳng hạn token lấy từ request đăng nhập.

Viết đúng những kiểm tra bạn đã học trong khóa này: status code, các header quan trọng, các field và kiểu dữ liệu trong body, định dạng lỗi cho các case negative. Một request không có test chỉ là một lần kiểm tra thủ công.

## Chạy cả collection

* **Collection Runner** (trong ứng dụng): chạy lần lượt mọi request của một collection hay thư mục và hiện kết quả từng test. Với một **file dữ liệu** (CSV hoặc JSON), nó chạy một lần cho mỗi dòng, biến một request thành data-driven test (input hợp lệ và không hợp lệ, giá trị biên).
* **Postman CLI** (trong CI): chạy collection từ dòng lệnh và làm build fail khi có test fail:

```bash
postman collection run ./shop-api.postman_collection.json -e ./staging.postman_environment.json -r cli,junit
```

`-e` chọn environment, `-r` chọn reporter (cli, json, junit, html); `-d` thêm file dữ liệu. **Newman** là công cụ dòng lệnh mã nguồn mở đời trước, bạn vẫn sẽ gặp trong nhiều pipeline.

## Thói quen tốt

* Mỗi API một collection, mỗi resource một thư mục, request được đặt tên theo điều nó kiểm tra.
* Request nào cũng có ít nhất một test status; các request negative cũng nằm trong collection.
* Dùng biến cho mọi URL, id và token: không viết cứng môi trường.
* Thứ tự quan trọng khi chạy: tạo, rồi đọc, rồi xóa; dọn dữ liệu bạn đã tạo.
* Chỉ test API bạn được phép test: API của chính bạn, API demo hoặc mock, không bao giờ test hệ thống production khi chưa được phép.

## Tự thử

API của QA Learning Lab tự mô tả bằng OpenAPI tại `/api/docs`. Tạo một collection có biến `baseUrl`, thêm `GET {{baseUrl}}/api/v1/health` với một test status và một test thời gian phản hồi, rồi thêm một request negative (một route không tồn tại) và test rằng nó trả về 404.

## Nguồn tham khảo

* Postman Learning Center: [Write scripts to test API response data](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/), [Store and reuse values using variables](https://learning.postman.com/docs/sending-requests/variables/variables/), [Reference variables in scripts](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables) và [Run a collection using the Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-run-collection), kiểm tra ngày 7/10/2026 (tài liệu v12). © Postman; tóm tắt bằng lời của team. Các script và collection ví dụ do team QALAB tự viết.

> Ý chính: một Postman collection gom các request, environment và biến đổi đích đến (scope hẹp nhất thắng), post-response script chứa các test (pm.test, pm.expect), và Collection Runner hoặc Postman CLI chạy lại tất cả, theo dữ liệu và trong CI.
