Automated test có giá trị nhất khi nó tự chạy, ở mọi thay đổi, trước khi thay đổi đó tới tay người dùng. Đó là việc của **CI/CD**: **continuous integration** (tích hợp liên tục) build và test mọi thay đổi ngay khi được push, còn **continuous delivery/deployment** (phân phối/triển khai liên tục) đưa bản build đã được test lên staging và production. Một test chỉ chạy khi ai đó nhớ ra mà bật trên laptop thì gần như không bảo vệ được gì.

## Một pipeline điển hình

**Pipeline** là danh sách các bước CI chạy cho một thay đổi, thường bước nhanh nhất chạy trước để phát hiện vấn đề sớm:

```text
pull request opened or updated
  1. install + build             (fails fast on compile errors)
  2. lint + typecheck
  3. unit tests                  (seconds)
  4. API tests                   (a minute or two)
  5. UI tests, in parallel       (a few minutes)
  6. reports + traces uploaded
merged to main
  7. deploy to staging -> smoke tests
  8. deploy to production -> smoke tests
```

Thứ tự đi theo kim tự tháp: phép kiểm tra rẻ, nhanh chạy trước; nếu build hay unit test đã fail thì không cần chờ UI test nữa.

## Chạy ở mọi pull request

Quy tắc quan trọng nhất: **bộ test chạy ở mọi pull request, và một test fail sẽ chặn việc merge.** Điều này cho người tạo thay đổi phản hồi nhanh, khi mọi thứ còn đang mới trong đầu họ, và giữ cho nhánh main lúc nào cũng release được.

Để điều này hoạt động:

* **Build phải fail khi có test fail.** Một pipeline hiển thị test đỏ mà vẫn cho merge sẽ dạy mọi người bỏ qua nó. Hãy đặt job test là required check (bắt buộc pass).
* **Bộ test phải đủ nhanh.** Nếu mất một giờ, mọi người sẽ thôi chờ. Giữ bộ test cho mỗi PR trong khoảng 10–15 phút; chuyển các bộ chậm, bao quát (chạy đủ mọi trình duyệt, gói regression dài) sang lượt chạy hằng đêm.
* **Bộ test phải đáng tin.** Flaky test trong bộ test chặn build phải được sửa hoặc quarantine nhanh (bài trước).

## Chạy song song và sharding

UI test chạy từng cái thì chậm, nhưng các test độc lập có thể chạy cùng lúc. Playwright chạy các file test trong nhiều **worker** song song trên một máy, và có thể chia bộ test cho nhiều máy CI bằng **sharding**:

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['html', { open: 'never' }], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

Với bốn máy CI, mỗi máy chạy `npx playwright test --shard=1/4` (rồi `2/4`, `3/4`, `4/4`) và bộ test xong trong khoảng một phần tư thời gian. Chạy song song chỉ hoạt động khi các test **độc lập**: dữ liệu dùng chung biến lượt chạy song song thành lượt chạy flaky.

Một số thiết lập trong config này dành riêng cho CI:

* `forbidOnly` làm lượt chạy fail nếu ai đó để quên `test.only` trong code, thứ sẽ âm thầm bỏ qua mọi test khác.
* `retries: 1` trên CI cho phép một lần fail thoáng qua được pass, trong khi report vẫn đánh dấu test là flaky để được sửa.
* `baseURL` lấy từ biến môi trường giúp cùng bộ test chạy được trên server local, staging hay production.

## Report và trace

Khi một test fail trên CI, không ai nhìn được màn hình. Pipeline phải giữ lại bằng chứng:

| Artifact | Nó cho bạn biết gì |
| --- | --- |
| **HTML report** | Test nào fail, kèm thông báo lỗi và các bước |
| **JUnit XML** | Kết quả mà công cụ CI có thể hiển thị ngay trong pull request |
| **Trace** | Bản ghi từng bước: snapshot DOM, network call, console log |
| **Screenshot / video** | Trang trông thế nào lúc fail |

Hãy upload chúng làm artifact của pipeline. Một thông báo lỗi kèm trace thường giúp bạn phân biệt bug thật với vấn đề của test chỉ trong vài phút.

## Smoke test sau khi deploy

Test trước khi merge kiểm tra code; nó không kiểm tra việc triển khai (cấu hình, secret, migration database, mạng thật). Sau mỗi lần deploy, một bộ **smoke test** ngắn chạy trên môi trường vừa được deploy: trang chủ tải được, người dùng đăng nhập được, API chính trả lời. Nó mất một hai phút và trả lời một câu hỏi: "bản release này về cơ bản có còn sống không?" Nếu fail trên staging, release dừng lại; nếu fail trên production, team rollback hoặc sửa ngay.

Smoke test trên production phải an toàn: chỉ kiểm tra đọc, hoặc dùng tài khoản test riêng, không thanh toán thật.

## QA phụ trách gì trong CI

QA engineer thường thiết kế test nào chạy ở đâu (mỗi PR, hằng đêm, sau deploy), theo dõi danh sách flaky test, giữ cho bộ test nhanh, và đảm bảo các lần fail được điều tra chứ không chỉ chạy lại.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 2.1.4 "DevOps and testing" và 2.2.3 (automated regression test trong CI). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus.
* Tài liệu Playwright: [Parallelism](https://playwright.dev/docs/test-parallel), [Sharding](https://playwright.dev/docs/test-sharding), [Trace viewer](https://playwright.dev/docs/trace-viewer-intro), [Continuous integration](https://playwright.dev/docs/ci). © Microsoft; Playwright và tài liệu của nó theo giấy phép Apache License 2.0. Code trong bài do team QALAB tự viết.

> Ý chính: chạy các test nhanh, độc lập ở mọi pull request và cho build fail khi chúng fail; chạy song song để luôn nhanh, giữ report và trace cho mọi lần fail, và chạy một bộ smoke test ngắn sau mỗi lần deploy.
