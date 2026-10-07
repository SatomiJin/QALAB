Các bài khác trong khóa này có code Playwright. Bài này đưa bạn từ một thư mục trống đến một bộ test chạy được: cài Playwright, trình cài đặt tạo ra những gì, chạy và debug test, ghi một bản nháp đầu tiên bằng codegen, và đọc trace khi test fail. QA Learning Lab test chính frontend của nó bằng Playwright, nên mọi thứ ở đây đều đang được dùng trong dự án này.

## Cài đặt

Playwright Test cần Node.js đời mới (tài liệu hiện ghi bản mới nhất của 22.x, 24.x hoặc 26.x). Trong một dự án mới hoặc đã có:

```bash
npm init playwright@latest
```

Trình cài đặt hỏi vài câu (TypeScript hay JavaScript, thư mục test, có tạo workflow GitHub Actions không, có cài trình duyệt không) và tạo ra:

| File | Mục đích |
|---|---|
| `playwright.config.ts` | Cấu hình: trình duyệt, base URL, retry, reporter, trace |
| `tests/example.spec.ts` | Một test ví dụ tối giản |
| `package.json` và lock file | Dependency `@playwright/test` |

Để cập nhật về sau: `npm install -D @playwright/test@latest`, rồi `npx playwright install --with-deps` để cài trình duyệt tương ứng.

## Chạy test

| Lệnh | Tác dụng |
|---|---|
| `npx playwright test` | Chạy mọi test, không hiện giao diện, trên mọi trình duyệt đã cấu hình, song song |
| `npx playwright test tests/login.spec.ts` | Chạy một file |
| `npx playwright test --project=chromium` | Chỉ chạy một project trình duyệt đã cấu hình |
| `npx playwright test --ui` | Mở **UI mode**: chọn test, xem chạy từng bước, chạy lại khi code thay đổi |
| `npx playwright show-report` | Mở **HTML report** của lần chạy gần nhất |

UI mode là nơi tốt nhất để viết và debug test: bạn thấy mọi hành động, trang web ở mỗi bước, và locator mà mỗi bước đã dùng.

## Phần cấu hình quan trọng

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

* `baseURL` cho phép test gọi `page.goto('/login')` trên bất kỳ môi trường nào.
* `projects` chạy cùng bộ test trên nhiều trình duyệt hoặc thiết bị giả lập (ở đây là desktop và mobile).
* `retries` chạy lại test bị fail; để bằng 0 khi chạy local để test chập chờn (flaky) vẫn lộ ra.
* `trace: 'on-first-retry'` chỉ ghi trace khi một test fail được chạy lại: tốn ít, mà có bằng chứng đúng lúc cần.

## Ghi bản nháp đầu tiên bằng codegen

```bash
npx playwright codegen http://localhost:5173
```

Một trình duyệt mở ra; mọi cú click và thao tác nhập của bạn được viết thành code test ngay bên cạnh. Codegen chọn locator theo **role, text và test id**, và tinh chỉnh chúng đến khi khớp đúng một phần tử. Hãy coi kết quả là **bản nháp**: đặt lại tên, bỏ các bước thừa, thay locator theo text (sẽ hỏng khi đổi ngôn ngữ) bằng test id, và thêm các **assertion** mà codegen không đoán được (điều gì phải đúng sau thao tác).

## Debug lỗi bằng trace viewer

Trace ghi lại toàn bộ test: mọi hành động, **DOM snapshot** trước và sau từng hành động, thông điệp console, network request, lỗi và dòng code nguồn. Mở nó từ HTML report (biểu tượng trace của test bị fail), hoặc ghi trace khi cần:

```bash
npx playwright test --trace on
```

Đọc một trace bị fail theo thứ tự: **lỗi** và bước xảy ra lỗi, **snapshot** của trang lúc đó (phần tử có ở đó không? bị ẩn? text khác?), rồi đến tab **network** (API có trả lỗi không?) và **console**. Phần lớn báo cáo "test bị hỏng" hóa ra là một defect thật, một locator đã đổi, hoặc thiếu một lần chờ, và trace cho bạn biết là trường hợp nào.

## Nguồn tham khảo

* Tài liệu Playwright: [Installation](https://playwright.dev/docs/intro), [Running and debugging tests](https://playwright.dev/docs/running-tests), [Generating tests](https://playwright.dev/docs/codegen-intro), [Trace viewer](https://playwright.dev/docs/trace-viewer-intro) và [Test configuration](https://playwright.dev/docs/test-configuration), kiểm tra ngày 7/10/2026. © Microsoft; Playwright và tài liệu của nó theo giấy phép Apache License 2.0. Phần cấu hình và giải thích do team QALAB tự viết.

> Ý chính: `npm init playwright@latest` tạo sẵn cấu hình và một test ví dụ; `npx playwright test` chạy bộ test, `--ui` giúp viết và debug, `show-report` hiện kết quả. Codegen cho một bản nháp vẫn cần locator và assertion tốt, còn trace viewer cho thấy chính xác chuyện gì đã xảy ra khi test fail.
