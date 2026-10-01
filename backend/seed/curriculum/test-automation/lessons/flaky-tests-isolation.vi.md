**Flaky test** là test lúc pass lúc fail trên cùng một đoạn code mà không có gì thay đổi. Đây là một trong những vấn đề tốn kém nhất của automation: mỗi build đỏ đều phải được điều tra, và một khi mọi người quen với câu "chắc lại flaky thôi", họ bắt đầu bỏ qua cả những lần fail thật. Một bộ test không ai tin còn tệ hơn không có bộ test nào.

## Vì sao flaky test quan trọng

* **Mất thời gian**: ai đó chạy lại pipeline, chờ, điều tra một lần fail không phải bug.
* **Mất niềm tin**: sau vài lần báo động giả, một regression thật được merge với câu "chạy lại đi, nó flaky".
* **Che giấu bug**: đôi khi sự flaky nằm trong chính sản phẩm (một race condition thật mà người dùng sẽ gặp), và gọi nó là "nhiễu của test" sẽ che mất bug.

## Nguyên nhân thường gặp

| Nguyên nhân | Chuyện gì xảy ra | Ví dụ |
| --- | --- | --- |
| **Thời gian (timing)** | Test kiểm tra trước khi ứng dụng sẵn sàng, hoặc phụ thuộc vào tốc độ của một thứ gì đó | Một `waitForTimeout(2000)` cố định quá ngắn trên máy CI đang bận |
| **Trạng thái dùng chung (shared state)** | Các test dùng chung dữ liệu, tài khoản hoặc cấu hình | Hai test cùng sửa profile của một user khi chạy song song |
| **Phụ thuộc thứ tự (order dependence)** | Test chỉ pass nếu một test khác chạy trước nó (hoặc fail nếu có) | Test B mong đợi sản phẩm mà test A tạo ra |
| **Dịch vụ bên ngoài** | API bên thứ ba, email hay sandbox thanh toán bị chậm hoặc sập | Test chờ một email thật từ nhà cung cấp email |
| **Môi trường và thời gian** | Kết quả phụ thuộc ngày, múi giờ, kích thước màn hình hoặc locale | Test "hạn ngày mai" fail ngay sau nửa đêm UTC |
| **Dữ liệu hoặc thứ tự ngẫu nhiên** | Giá trị ngẫu nhiên không có seed hoặc danh sách API trả về không sắp xếp | Assert dòng đầu tiên của danh sách mà backend trả về theo thứ tự bất kỳ |
| **Animation và thứ còn sót lại** | Cú click rơi vào lúc đang chuyển cảnh hoặc trúng một toast cũ | Bấm nút khi dialog vẫn đang trượt vào |

## Tính độc lập của test

Phần lớn sự flaky biến mất khi các test **độc lập** (isolated): mỗi test chạy được một mình, theo mọi thứ tự, song song, bao nhiêu lần cũng được, và cho cùng một kết quả. Trong thực tế:

* **Trạng thái mới cho mỗi test**: Playwright cho mỗi test một browser context mới (không có cookie hay storage từ test khác). Hãy giữ nguyên như vậy: đừng tự tay chia sẻ trang đã đăng nhập giữa các test.
* **Dữ liệu riêng cho mỗi test**: user, đơn hàng và tên duy nhất được tạo trong fixture, dọn dẹp sau đó (xem bài về API).
* **Không phụ thuộc thứ tự**: nếu test B cần một sản phẩm, B tự tạo nó.
* **Kiểm soát thứ bạn không sở hữu**: thay dịch vụ bên thứ ba bằng stub hoặc mock ở rìa hệ thống, để một sandbox thanh toán chậm không làm fail test checkout của bạn. Giữ vài test riêng để kiểm tra tích hợp thật.
* **Kiểm soát thời gian và tính ngẫu nhiên**: cố định đồng hồ hoặc múi giờ trong test, đặt seed cho giá trị ngẫu nhiên, sắp xếp danh sách trước khi so sánh.

Playwright có thể mock một network call để test không phụ thuộc vào dịch vụ bên ngoài:

```ts
test('shows the shipping estimate', async ({ page }) => {
  await page.route('**/api/shipping-estimate', (route) =>
    route.fulfill({ json: { days: 3 } }),
  );
  await page.goto('/checkout');
  await expect(page.getByTestId('shipping-estimate')).toHaveText('Arrives in 3 days');
});
```

## Điều tra một flaky test

1. **Tái hiện**: chạy test nhiều lần, một mình và cùng cả bộ. Trong Playwright: `npx playwright test checkout.spec.ts --repeat-each=20`. Thử chạy song song và tuần tự (`--workers=1`) để xem các test khác có ảnh hưởng không.
2. **Thu thập bằng chứng**: giữ lại trace, screenshot, video và log của các lượt fail. So sánh từng bước giữa một lượt pass và một lượt fail.
3. **Tìm quy luật**: chỉ trên CI? Chỉ khi chạy song song? Chỉ sau một test nhất định? Chỉ vào một số giờ? Mỗi dấu hiệu chỉ tới một nguyên nhân trong bảng trên.
4. **Sửa root cause**: thay lệnh chờ cố định bằng web-first assertion, cho test dữ liệu riêng, stub dịch vụ bên ngoài. Rồi chạy lặp lại để xác nhận nó đã ổn định.
5. **Kiểm tra cả sản phẩm**: nếu chính ứng dụng hành xử khác đi theo thời gian (bấm gửi hai lần tạo ra hai đơn hàng), đó là bug cần báo cáo, không phải test cần sửa.

## Retry và quarantine

**Retry** (tự động chạy lại test bị fail) là lưới an toàn, không phải thuốc chữa. Hãy giữ ở mức thấp (một hoặc hai lần trên CI), và theo dõi những test chỉ pass khi chạy lại: Playwright báo chúng là **flaky**, đó chính là danh sách việc cần làm.

**Quarantine** (cách ly) là tạm thời đưa một flaky test đã biết ra khỏi bộ test chặn build, kèm ticket và người phụ trách, để nó thôi chặn mọi người trong khi có người sửa. Một test bị cách ly mà không ai sửa thì chẳng khác gì một test bị xóa, chỉ thêm vài bước, nên hãy đặt hạn cho nó.

> Ý chính: flaky test phá hủy niềm tin; hãy làm mọi test độc lập (dữ liệu riêng, trạng thái mới, không phụ thuộc thứ tự, kiểm soát dịch vụ bên ngoài và thời gian), điều tra lỗi bằng chạy lặp lại và trace, và sửa root cause thay vì thêm lệnh chờ hay retry.
