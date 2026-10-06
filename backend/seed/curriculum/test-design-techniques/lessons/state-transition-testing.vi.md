Có những hệ thống không phản hồi giống nhau với cùng một đầu vào: điều đó phụ thuộc vào những gì đã xảy ra trước. Mật khẩu đúng thì đăng nhập được, trừ khi bạn đã nhập sai ba lần. **State transition testing** (kiểm thử chuyển trạng thái) mô hình hóa "trí nhớ" đó thành các state và event, rồi test mọi bước chuyển được phép và những bước chuyển phải bị từ chối.

## State, event và transition

| Thuật ngữ | Ý nghĩa | Ví dụ đăng nhập |
|---|---|---|
| **State** (trạng thái) | Tình trạng hệ thống đang ở, làm thay đổi cách nó phản ứng | Locked (bị khóa) |
| **Event** (sự kiện) | Điều gì đó xảy ra: thao tác người dùng, thời gian, một message | Nhập sai mật khẩu |
| **Transition** (chuyển trạng thái) | Bước chuyển từ state này sang state khác do một event gây ra | 2 failed → Locked |
| **Action** (hành động) | Việc hệ thống làm trong lúc chuyển | Hiện "Account locked" |

Một transition cũng có thể giữ nguyên state: ở Locked, nhập sai mật khẩu thì tài khoản vẫn Locked.

## Ví dụ: khóa tài khoản sau 3 lần đăng nhập sai

Requirement: *"Sau 3 lần nhập sai mật khẩu liên tiếp, tài khoản bị khóa. Nhập đúng mật khẩu trước đó thì người dùng đăng nhập được và bộ đếm được đặt lại. Chỉ admin mới mở khóa được tài khoản đã bị khóa."*

Các state: **Ready** (0 lần sai), **1 failed**, **2 failed**, **Locked**, **Logged in**.

Happy path rất ngắn: Ready → (mật khẩu đúng) → Logged in. Phần thú vị là bộ đếm:

* Ready → mật khẩu sai → 1 failed
* 1 failed → mật khẩu sai → 2 failed
* 2 failed → mật khẩu sai → Locked
* 1 failed hoặc 2 failed → mật khẩu đúng → Logged in (đặt lại bộ đếm)
* Locked → admin mở khóa → Ready

## State table

Sơ đồ cho thấy các transition được phép. Một **state table** (bảng trạng thái) đặt mọi state đối chiếu với mọi event, nên các chỗ trống hiện ra rõ ràng:

| State \ Event | Mật khẩu đúng | Mật khẩu sai | Admin mở khóa |
|---|---|---|---|
| Ready | Logged in | 1 failed | — (không hợp lệ) |
| 1 failed | Logged in | 2 failed | — (không hợp lệ) |
| 2 failed | Logged in | Locked | — (không hợp lệ) |
| Locked | Locked, từ chối đăng nhập | Locked | Ready |

Mỗi ô "—" là một **invalid transition** (chuyển trạng thái không hợp lệ): một event mà state đó không được phản ứng. Ở đây, mở khóa một tài khoản không bị khóa thì không được thay đổi gì. Ô "Locked + mật khẩu đúng" là test quan trọng nhất của cả tính năng: nếu nó cho người dùng đăng nhập, cơ chế khóa trở nên vô dụng.

## Rút ra test

1. **Phủ mỗi transition hợp lệ ít nhất một lần** (gọi là 0-switch coverage). Bảng trên có 9 transition hợp lệ, và vài test dài có thể phủ chúng theo chuỗi: sai, sai, sai (Locked), đúng (vẫn Locked), admin mở khóa (Ready), đúng (Logged in)…
2. **Test các invalid transition**: từng ô "—", để kiểm tra rằng không có gì xảy ra và không có gì bị hỏng.
3. **Kiểm tra các quy tắc của bộ đếm** mà requirement ngụ ý: mật khẩu đúng có thực sự đặt lại bộ đếm không? Test sai, sai, đúng, đăng xuất, sai, sai: tài khoản chưa được phép bị khóa.
4. Với mỗi bước, expected result nêu **state mới**, không chỉ thông báo trên màn hình.

## Ba tiêu chí coverage

| Tiêu chí | Coverage item | 100 % nghĩa là |
|---|---|---|
| **All states** | Các state | Mọi state được đi tới ít nhất một lần |
| **Valid transitions** (0-switch) | Các transition hợp lệ | Mọi transition hợp lệ được chạy; tiêu chí được dùng nhiều nhất |
| **All transitions** | Các transition hợp lệ và không hợp lệ trong state table | Mọi transition hợp lệ được chạy và mọi transition không hợp lệ được thử |

All states là yếu nhất: bạn có thể đi qua mọi state mà không thử hết các transition. Đạt đủ valid transitions coverage thì chắc chắn đạt all states; đạt đủ all transitions coverage thì đạt cả hai, và đây là mức tối thiểu cho phần mềm mission-critical và safety-critical. Mỗi test case chỉ thử **một transition không hợp lệ**: nếu một test chạm hai cái, failure đầu tiên có thể che mất cái thứ hai (**defect masking**).

Trong sơ đồ, transition thường được ghi dạng `event [guard condition] / action`, ví dụ `wrong password [failures = 2] / show "Account locked"`.

## Những chỗ khác nên dùng

* **Trạng thái đơn hàng**: Created → Paid → Shipped → Delivered, và chỉ một số state mới chuyển được sang Cancelled.
* **Workflow**: draft, in review, published, archived.
* **Thiết bị và phiên làm việc**: bộ hẹn giờ đăng xuất sau 15 phút không thao tác, một giao dịch thanh toán bị timeout.

Hãy hỏi "tính năng này có những state nào?" mỗi khi nó có một field trạng thái, một bộ đếm hay một bộ hẹn giờ. Nếu nhóm chưa có sơ đồ, việc vẽ một sơ đồ đã là một lần review hữu ích: transition bị thiếu chính là requirement bị thiếu.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 4.2.4 "State transition testing". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: mô hình hóa các state và event, test mọi transition hợp lệ, và chứng minh rằng các transition không hợp lệ bị từ chối.
