Một automated test chỉ tốt bằng những gì nó kiểm tra và cách nó chờ. Test kiểm tra quá ít sẽ pass trong khi tính năng đã hỏng. Test chờ sai cách sẽ fail trong khi tính năng vẫn chạy, hoặc phí hàng phút ở mỗi lượt chạy. Bài này nói về cả hai.

## Assertion có ý nghĩa

**Assertion** là expected result của test được viết thành code: "điều này phải đúng, nếu không thì fail". Một test không có assertion thực sự thì không phải là test, chỉ là một script bấm chuột.

| Assertion yếu | Vì sao yếu | Assertion có ý nghĩa |
| --- | --- | --- |
| Trang đã tải xong | Trang lỗi cũng tải xong | Trang xác nhận đơn hàng hiển thị mã đơn và tổng tiền |
| Status code là `200` | Body vẫn có thể sai | Status `201` **và** `total` là `24` |
| Một phần tử tồn tại | Nó có thể đang bị ẩn hoặc hiển thị sai giá trị | Phần tử hiển thị và có text `"3 items"` |
| Không có exception nào | Im lặng không phải là bằng chứng | Dòng mới xuất hiện trong danh sách |

Thói quen tốt:

* **Assert kết quả mà người dùng hoặc client quan tâm**, không phải chi tiết nội bộ có thể thay đổi.
* **Cụ thể**: giá trị chính xác khi đã biết, không phải "không rỗng".
* **Mỗi test một hành vi**, với số assertion vừa đủ cho hành vi đó. Một test tên "applies a coupon" kiểm tra tổng tiền sau giảm giá, không phải mười thứ không liên quan.
* **Làm cho lỗi dễ đọc**: `expected "17.00" but got "18.00"` nói được nhiều hơn `expected true but got false`.

## Vì sao cần chờ

Ứng dụng web là bất đồng bộ (asynchronous). Sau một cú click, trình duyệt gửi request, server trả lời, trang cập nhật. Một test kiểm tra kết quả ngay lập tức có thể kiểm tra quá sớm và fail, dù người dùng chờ nửa giây sẽ thấy kết quả đúng.

## Cách sai: chờ cố định

```ts
await page.getByRole('button', { name: 'Place order' }).click();
await page.waitForTimeout(5000); // wait 5 seconds and hope
expect(await page.getByTestId('order-status').textContent()).toBe('Confirmed');
```

Một lần chờ cố định (fixed sleep) luôn sai theo một hướng:

* **Quá ngắn**: trên máy CI chậm, đơn hàng mất 6 giây, test fail. Đây là nguyên nhân kinh điển của **flaky test** (bài tiếp theo).
* **Quá dài**: ở lượt chạy nhanh, đơn được xác nhận sau 300 ms, nhưng test vẫn chờ đủ 5 giây. Với 500 test, đó là hơn 40 phút không làm gì.

Tăng con số "cho tới khi pass" chỉ dời vấn đề đi chỗ khác.

## Cách đúng: chờ một điều kiện

Hãy chờ **đúng thứ bạn cần**, với một timeout làm giới hạn an toàn. Hầu hết công cụ đều hỗ trợ điều này. Playwright tích hợp sẵn ở hai mức.

**Thao tác tự chờ (auto-waiting).** Trước `click()` hay `fill()`, Playwright chờ cho tới khi phần tử đã gắn vào trang, hiển thị, đứng yên và được bật. Bạn không cần thêm lệnh chờ trước các thao tác.

**Web-first assertion.** `await expect(locator).toHaveText(...)` thử lại phép kiểm tra cho tới khi pass hoặc hết timeout (mặc định 5 giây):

```ts
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByTestId('order-status')).toHaveText('Confirmed');
```

Ở lượt chạy nhanh, nó kết thúc ngay khi text xuất hiện; ở lượt chạy chậm, nó chờ lâu hơn; nó chỉ fail khi text không bao giờ xuất hiện. So sánh hai cách viết:

```ts
// reads the text once, immediately: may be too early
expect(await page.getByTestId('order-status').textContent()).toBe('Confirmed');

// retries until the text matches or the timeout ends
await expect(page.getByTestId('order-status')).toHaveText('Confirmed');
```

Các web-first assertion hữu ích: `toBeVisible()`, `toHaveText()`, `toHaveValue()`, `toHaveCount()`, `toHaveURL()`, `toBeEnabled()`.

## Chờ một thứ không nằm trên trang

Đôi khi điều kiện là một network call hoặc URL thay đổi. Hãy chờ sự kiện đó, không chờ thời gian:

```ts
const saved = page.waitForResponse((r) => r.url().includes('/api/profile') && r.ok());
await page.getByRole('button', { name: 'Save' }).click();
await saved;
await expect(page).toHaveURL(/\/profile$/);
```

Bắt đầu chờ **trước** thao tác kích hoạt nó, nếu không response có thể tới trước khi bạn kịp lắng nghe.

## Timeout là giới hạn, không phải thời gian chờ

Timeout nói rằng "bỏ cuộc sau chừng này thời gian". Tăng timeout cho một trang thực sự chậm là được; dùng nó để che một bug trong ứng dụng hay một chỗ thiếu chờ trong test thì không. Nếu một bước thường xuyên cần 20 giây, đó là vấn đề hiệu năng đáng được báo cáo.

> Ý chính: assert những kết quả cụ thể mà người dùng quan tâm, và chờ điều kiện (auto-waiting, web-first assertion, response mong đợi) thay vì chờ cố định, vốn vừa chậm vừa flaky.
