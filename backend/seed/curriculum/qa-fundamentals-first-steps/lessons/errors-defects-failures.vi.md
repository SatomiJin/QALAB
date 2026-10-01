Ba từ mô tả chuỗi đi từ một sai lầm của con người đến một vấn đề nhìn thấy được. Bug report và test report dùng chúng rất chính xác.

## Chuỗi nguyên nhân

1. **Error (mistake — sai lầm)**: một người làm sai điều gì đó. Developer đọc nhầm "ít nhất 18" thành "lớn hơn 18".
2. **Defect (bug, fault — lỗi)**: kết quả nằm trong sản phẩm công việc. Code ghi `age > 18` thay vì `age >= 18`.
3. **Failure (hỏng hóc)**: hệ thống làm điều nó không được làm, khi defect được thực thi. Người đúng 18 tuổi không đăng ký được.

Không phải defect nào cũng gây ra failure: nếu chưa ai đúng 18 tuổi đăng ký, failure sẽ không bao giờ lộ ra. Đó là lý do **boundary value** (giá trị biên) được test một cách có chủ đích.

## Root cause

**Root cause** (nguyên nhân gốc) là lý do sớm nhất dẫn tới error: requirement không rõ, áp lực thời gian, thiếu review. Sửa defect thì hết một bug; sửa root cause thì ngăn được những bug tiếp theo.

## Ví dụ

| | Ví dụ |
|---|---|
| Error | Requirement "miễn phí vận chuyển từ $50" bị hiểu thành "trên $50" |
| Defect | `if (total > 50)` trong code thanh toán |
| Failure | Đơn hàng đúng $50.00 vẫn bị tính phí vận chuyển |
| Root cause | Requirement không đưa ví dụ ở giá trị biên |

> Trong bug report, bạn mô tả **failure** (điều bạn quan sát được). Developer sẽ tìm ra **defect**.
