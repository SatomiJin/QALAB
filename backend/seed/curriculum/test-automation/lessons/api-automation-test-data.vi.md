API test gửi HTTP request thẳng tới backend và kiểm tra response: status code, body và các tác động phụ. Không có trình duyệt, không có bố cục, nên chúng nhanh và ổn định, và nằm ở giữa kim tự tháp. Phần khó phần lớn không nằm ở bản thân request mà ở **test data**: mỗi test cần đúng dữ liệu tồn tại trước khi bắt đầu, và không được vấp vào dữ liệu các test khác để lại.

## API test kiểm tra gì

Với mỗi request, hãy kiểm tra những gì quan trọng với contract (hợp đồng giao tiếp):

| Kiểm tra | Ví dụ |
| --- | --- |
| **Status code** | `201` sau khi tạo đơn hàng, `400` với body không hợp lệ, `401` khi không có token |
| **Body** | Đơn hàng có `status: "pending"` và đúng `total` |
| **Tác động phụ** | Đọc lại đơn bằng `GET /orders/:id` thì vẫn thấy nó |
| **Định dạng lỗi** | Một response `400` nêu tên field không hợp lệ |

Chỉ kiểm tra status code là một test yếu: một response `200` với tổng tiền sai vẫn pass.

## API test đầu tiên

Fixture `request` của Playwright gửi HTTP call mà không cần mở trình duyệt:

```ts
import { test, expect } from '@playwright/test';

test('creates an order with the basket total', async ({ request }) => {
  const response = await request.post('/api/orders', {
    data: { items: [{ sku: 'MUG-BLUE', quantity: 2 }] },
  });

  expect(response.status()).toBe(201);
  const order = await response.json();
  expect(order.total).toBe(24);
  expect(order.status).toBe('pending');
});
```

## Test data: phần khó

Các test dùng chung dữ liệu sẽ phụ thuộc lẫn nhau. Những vấn đề điển hình:

* Test A xóa user mà test B dùng để đăng nhập. B fail, nhưng chỉ khi A chạy trước.
* Hai test chạy song song và cùng cố đăng ký `test@example.com`. Một test nhận `409 Conflict`.
* Một test mong đợi danh sách có "3 đơn hàng", nhưng lượt chạy hôm qua để lại 40 đơn.

Các quy tắc giúp tránh điều này:

1. **Mỗi test tự tạo dữ liệu nó cần** (qua API, không qua UI: nhanh hơn).
2. **Dữ liệu là duy nhất**: thêm phần ngẫu nhiên hoặc theo thời gian vào email, tên và id.
3. **Mỗi test tự dọn dẹp** những gì nó tạo ra, hoặc chạy trên dữ liệu không ai khác dùng.
4. **Không bao giờ phụ thuộc vào việc một test khác đã chạy trước.**

## Setup và teardown với fixture

**Fixture** chuẩn bị một thứ trước khi test chạy và dọn nó sau đó. Trong Playwright bạn tự định nghĩa fixture bằng `test.extend`. Phần code trước `use()` là **setup**, phần sau là **teardown**, và nó vẫn chạy kể cả khi test fail.

```ts
import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

type User = { id: string; email: string; password: string };

export const test = base.extend<{ user: User }>({
  user: async ({ request }, use) => {
    // setup: a fresh user for this test only
    const email = `qa-${randomUUID()}@example.com`;
    const password = 'Correct-Pass-1';
    const response = await request.post('/api/users', { data: { email, password } });
    const { id } = await response.json();

    await use({ id, email, password });

    // teardown: runs after the test, pass or fail
    await request.delete(`/api/users/${id}`);
  },
});

test('a new user has no orders', async ({ request, user }) => {
  const response = await request.get(`/api/users/${user.id}/orders`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});
```

Mỗi test cần `user` sẽ có tài khoản riêng, nên các test chạy được theo bất kỳ thứ tự nào và chạy song song được.

## Factory

Khi nhiều test cần dữ liệu tương tự nhau, một **factory** tạo dữ liệu với giá trị mặc định hợp lý và để mỗi test chỉ ghi đè thứ nó quan tâm:

```ts
export function buildOrder(overrides: Partial<{ sku: string; quantity: number; coupon: string }> = {}) {
  return { sku: 'MUG-BLUE', quantity: 1, ...overrides };
}

// a test that is about coupons says only that
const order = buildOrder({ coupon: 'SAVE15' });
```

Giờ test cho thấy dữ liệu của nó có gì đặc biệt, và giá trị mặc định được cố định ở một chỗ.

## API test còn giúp chuẩn bị cho UI test

Một UI test cho "sửa đơn hàng" không cần bấm qua toàn bộ checkout trước. Hãy tạo đơn hàng bằng một API call trong fixture, rồi mở trang sửa. UI test ngắn hơn, nhanh hơn và chỉ kiểm tra đúng màn hình nó cần.

## Nguồn tham khảo

* Tài liệu Playwright: [API testing](https://playwright.dev/docs/api-testing), [Fixtures](https://playwright.dev/docs/test-fixtures). © Microsoft; Playwright và tài liệu của nó theo giấy phép Apache License 2.0. Code trong bài do team QALAB tự viết.

> Ý chính: kiểm tra status code, body và tác động phụ; cho mỗi test dữ liệu riêng, duy nhất qua fixture và factory, tạo bằng API và dọn dẹp sau đó, để các test không bao giờ phụ thuộc vào nhau.
