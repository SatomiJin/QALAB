UI test điều khiển giao diện thật giống như người dùng: mở trang, gõ, bấm, rồi kiểm tra thứ hiện ra. Đây là loại automated test sát thực tế nhất, và cũng dễ trở nên mong manh nhất. Hai thói quen giúp UI test dễ bảo trì, dù bạn dùng công cụ nào: **locator ổn định** và **page object**. Các ví dụ dùng Playwright với TypeScript.

## Locator: cách test tìm một phần tử

**Locator** cho công cụ biết cần thao tác lên phần tử nào. Nếu nó phụ thuộc vào những chi tiết hay thay đổi (bố cục trang, tên class tự sinh), test sẽ vỡ dù tính năng vẫn chạy đúng.

Hãy ưu tiên locator mô tả phần tử theo cách người dùng hoặc sản phẩm nhìn thấy nó:

| Locator | Ví dụ | Độ ổn định |
| --- | --- | --- |
| **Role + accessible name** | `getByRole('button', { name: 'Sign in' })` | Cao: khớp với thứ người dùng thấy và thứ screen reader dùng |
| **Label** | `getByLabel('Email')` | Cao: gắn với nhãn của field trong form |
| **Test id** | `getByTestId('checkout-total')` | Cao: một `data-testid` được thêm có chủ đích, không phụ thuộc chữ và bố cục |
| **Text** | `getByText('Order placed')` | Trung bình: vỡ khi câu chữ hoặc ngôn ngữ thay đổi |
| **CSS class / cấu trúc** | `.btn-primary:nth-child(2)` | Thấp: vỡ khi style hoặc thứ tự thay đổi |
| **XPath dài** | `/html/body/div[2]/div/form/button` | Rất thấp: vỡ khi bất kỳ phần tử cha nào thay đổi |

Locator theo role và label còn có lợi ích phụ: nếu test không tìm được nút theo role và tên, người dùng screen reader nhiều khả năng cũng không tìm được, nên test bắt luôn cả vấn đề accessibility (khả năng truy cập). Dùng **test id** khi không có role hay label phù hợp (một số tiền, một dòng trong bảng) hoặc khi chữ trên UI được dịch.

## UI test đầu tiên

```ts
import { test, expect } from '@playwright/test';

test('registered user can sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('learner@example.com');
  await page.getByLabel('Password').fill('Correct-Pass-1');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

Nó đọc gần giống một test case thủ công: các bước, rồi expected result. Nhưng hãy tưởng tượng 30 test đều đăng nhập theo cách này. Khi nút được đổi tên thành "Log in", bạn phải sửa 30 file.

## Page Object Model

**Page Object Model (POM)** đặt hiểu biết về *cách một trang hoạt động* (locator và thao tác của nó) vào một class cho mỗi trang. Khi đó test nói chuyện với trang bằng ngôn ngữ của tính năng, không phải của HTML.

```ts
import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
    this.error = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

test('wrong password shows an error', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn('learner@example.com', 'wrong-password');

  await expect(login.error).toHaveText('Invalid email or password');
});
```

Giờ đổi tên nút chỉ là sửa một dòng trong `LoginPage`, và mọi test vẫn chạy.

## Quy tắc cho page object tốt

* **Một class cho mỗi trang hoặc component** (header, date picker), đặt tên theo thứ người dùng thấy.
* **Method mô tả thao tác của người dùng**: `signIn`, `addToBasket`, không phải `clickButton3`.
* **Giữ assertion trong test**, không giấu trong page object, để mỗi test cho thấy rõ nó kiểm tra gì. Để lộ locator (như `login.error`) giúp test assert trên chúng.
* **Không đặt logic test trong page**: page object không quyết định kết quả là đúng hay sai.
* **Đừng xây page object cho mọi thứ cùng lúc.** Tạo nó khi có test thứ hai cần dùng cùng trang.

## UI test nằm ở đỉnh kim tự tháp

Kể cả khi có locator tốt và page object, UI test vẫn là tầng chậm và đắt nhất. Hãy dùng nó cho những hành trình người dùng thực sự đi qua (đăng nhập, checkout), còn phép tính và quy tắc validation thì kiểm tra ở tầng thấp hơn.

> Ý chính: tìm phần tử theo role, label hoặc test id thay vì đường dẫn CSS, và gói locator cùng thao tác của mỗi trang vào một page object để một thay đổi UI chỉ cần sửa ở một chỗ.
