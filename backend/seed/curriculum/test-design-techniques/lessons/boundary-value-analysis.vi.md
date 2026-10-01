Defect rất thích các biên. Một developer viết `<` thay vì `<=` sẽ có mọi giá trị đúng, trừ đúng giá trị nằm trên giới hạn. **Boundary value analysis** (BVA, phân tích giá trị biên) nhắm chính xác vào những giá trị đó: giá trị nhỏ nhất và lớn nhất của mỗi partition, cùng các giá trị liền kề.

## Vì sao biên hay hỏng

Requirement ghi "từ 8 đến 20 ký tự" hoặc "đơn từ 100 USD trở lên". Code biến những câu đó thành phép so sánh, và phép so sánh rất dễ lệch một chút:

| Requirement | Code đúng | Defect thường gặp | Giá trị làm lộ defect |
|---|---|---|---|
| Độ dài 8 đến 20 | `len >= 8 && len <= 20` | `len > 8` | 8 (bị từ chối nhầm) |
| Độ dài 8 đến 20 | `len >= 8 && len <= 20` | `len <= 21` | 21 (được chấp nhận nhầm) |
| Miễn phí giao hàng từ 100 USD | `total >= 100` | `total > 100` | 100.00 (không được miễn phí) |

Đây là các defect **off-by-one** (lệch một đơn vị). Một giá trị ở giữa như 14 pass với cả code đúng lẫn code sai, nên chỉ dùng EP thì không bao giờ bắt được chúng.

## BVA 2 giá trị

Với mỗi biên, test giá trị **nằm trên** biên và **giá trị liền kề ở phía bên kia**. Với khoảng hợp lệ từ min đến max, ta có bốn giá trị:

* min − 1 (không hợp lệ), min (hợp lệ), max (hợp lệ), max + 1 (không hợp lệ).

Ví dụ: mật khẩu dài 8 đến 20 ký tự → test **7, 8, 20, 21**.

## BVA 3 giá trị

Với mỗi biên, test giá trị nằm trên biên **và cả hai giá trị liền kề**. Ta có sáu giá trị:

* min − 1, min, min + 1, max − 1, max, max + 1.

Ví dụ mật khẩu → **7, 8, 9, 19, 20, 21**.

Các giá trị thêm vào (9 và 19) bắt được những defect như điều kiện viết thành `len == 8` thay vì `len >= 8`, thứ mà BVA 2 giá trị sẽ bỏ sót ở phía đó. Dùng BVA 3 giá trị ở những chỗ sai sót gây tốn kém: giá tiền, hạn mức, quy tắc bảo mật.

## "Giá trị liền kề" là gì?

Nó phụ thuộc vào bước nhỏ nhất mà field cho phép:

* Số nguyên: bước là 1 (17 và 18).
* Tiền có phần xu: bước là 0.01 (99.99 và 100.00).
* Ngày: bước là một ngày (ngày hợp lệ cuối cùng và ngày kế tiếp).
* Độ dài chuỗi: một ký tự.

Lấy bước từ requirement hoặc giao diện. Test 99 thay vì 99.99 cho biên giá tiền là đang test một giá trị trong partition, không phải test biên.

## Ví dụ: kết hợp EP và BVA

Requirement: *"Số lượng phải là số nguyên từ 1 đến 10."*

| Kỹ thuật | Giá trị | Lý do |
|---|---|---|
| EP | 5 (hợp lệ), từ 0 trở xuống (không hợp lệ), từ 11 trở lên (không hợp lệ), 2.5 (không hợp lệ) | Mỗi partition một giá trị |
| BVA 2 giá trị | 0, 1, 10, 11 | Các biên của khoảng hợp lệ |
| Bộ kết hợp | **0, 1, 5, 10, 11, 2.5** | Sáu test phủ mọi partition và mọi biên |

Thực tế, các giá trị BVA đã phủ luôn các partition số không hợp lệ (0 và 11 vừa là giá trị biên vừa đại diện cho partition), nên bộ kết hợp vẫn nhỏ. Hãy giữ thêm một giá trị ở giữa: nó cho thấy trường hợp "bình thường" chạy đúng và giúp bạn phân biệt defect ở biên với defect chung.

## Mẹo

* **Biên nào cũng tính**, không chỉ giới hạn số: phần tử đầu và cuối của danh sách, field trống (độ dài 0), dung lượng file tối đa, nửa đêm của một ngày.
* **Biên mở** ("từ 100 trở lên") chỉ có một biên lấy từ requirement; hãy kiểm tra xem hệ thống có giới hạn kỹ thuật ẩn nào không (cột database, kích thước kiểu số nguyên).
* Ghi cả giá trị biên **và** kết quả mong đợi trong test case: "8 ký tự → được chấp nhận" là một test; "8 ký tự" mới chỉ là dữ liệu.

> Ý chính: test các biên của mỗi partition, ngay trên biên và vừa vượt qua biên, vì đó là nơi defect off-by-one trú ngụ.
