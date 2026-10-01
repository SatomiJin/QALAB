Hầu hết các field nhận nhiều giá trị hơn mức bạn có thể gõ thử. **Equivalence partitioning** (EP, phân vùng tương đương) giúp bạn test chúng chỉ với vài giá trị: chia các đầu vào có thể có thành các nhóm mà hệ thống phải xử lý giống nhau, rồi test một giá trị của mỗi nhóm.

## Ý tưởng: những giá trị hành xử giống nhau

Một **partition** (hay equivalence class, lớp tương đương) là tập giá trị mà phần mềm phải xử lý y hệt nhau. Nếu hệ thống xử lý đúng một giá trị trong partition, rất có thể nó cũng xử lý đúng mọi giá trị còn lại. Nếu nó sai với một giá trị, nhiều khả năng nó sai với tất cả.

Vì vậy, thay vì test mọi số lượng từ 1 đến 10, bạn test một giá trị, ví dụ 5, và tin rằng nó đại diện cho cả nhóm. Niềm tin đó là giả định nền tảng của EP, và cũng là lý do các partition phải lấy từ requirement chứ không phải đoán.

## Partition hợp lệ và không hợp lệ

Mỗi đầu vào có hai loại partition:

* **Partition hợp lệ (valid)**: các giá trị hệ thống phải chấp nhận và xử lý.
* **Partition không hợp lệ (invalid)**: các giá trị hệ thống phải từ chối, tốt nhất là kèm một thông báo rõ ràng.

Tester hay quên partition không hợp lệ, trong khi đó lại là nơi nhiều defect trú ngụ: thiếu kiểm tra, crash, thông báo lỗi khó hiểu, lưu dữ liệu đáng lẽ không được lưu.

## Ví dụ: field số lượng

Requirement: *"Trên trang sản phẩm, số lượng phải là số nguyên từ 1 đến 10."*

| Partition | Các giá trị trong đó | Hợp lệ? | Giá trị test |
|---|---|---|---|
| Dưới khoảng | 0, -1, -50… | Không hợp lệ | 0 |
| Trong khoảng | 1 đến 10 | Hợp lệ | 5 |
| Trên khoảng | 11, 12, 999… | Không hợp lệ | 11 |
| Không phải số nguyên | 2.5, "abc", để trống | Không hợp lệ | 2.5 |

Bốn partition, bốn test. Mỗi giá trị test đại diện cho cả nhóm của nó. Để ý rằng nhóm "không phải số nguyên" có thể chia nhỏ hơn (số thập phân, chữ, để trống) nếu requirement hoặc rủi ro cho thấy hệ thống xử lý chúng khác nhau, ví dụ khi field trống được kiểm tra bởi đoạn code khác với trường hợp nhập chữ.

## Quy tắc chọn partition

1. **Đọc requirement để tìm mọi điều kiện.** Mỗi khoảng giá trị, danh sách hay quy tắc cho bạn ít nhất một partition hợp lệ và một partition không hợp lệ.
2. **Mỗi partition một giá trị** là mức tối thiểu. Thêm giá trị từ cùng một partition hiếm khi tìm ra defect mới.
3. **Test từng partition không hợp lệ một.** Nếu một test nhập hai giá trị sai cùng lúc (số lượng 0 *và* mã coupon sai), thông báo lỗi đầu tiên có thể che mất lần kiểm tra thứ hai. Bạn sẽ không biết cả hai có được xử lý hay không.
4. **Danh sách cũng là partition.** Dropdown "quốc gia" với quy tắc giao hàng "EU" và "ngoài EU" có hai partition hợp lệ, dù nó có 200 quốc gia.
5. **Ghi lại giả định.** Nếu bạn không chắc hai giá trị có hành xử giống nhau, có thể chúng thuộc hai partition khác nhau: hãy hỏi, hoặc test cả hai.

## EP mang lại gì

* **Ít test hơn mà phạm vi vẫn vậy.** Mười số lượng hợp lệ trở thành một test.
* **Coverage nhìn thấy được.** Bạn có thể nói "partition nào cũng có test", một mục tiêu đo được: partition coverage = số partition đã test ÷ số partition đã xác định.
* **Nền tảng cho boundary value.** EP chọn một giá trị ở giữa mỗi nhóm; bài sau sẽ test các biên của nhóm.

EP không nói gì về biên của các partition, nơi các lỗi lệch một đơn vị (off-by-one) ẩn nấp. Vì thế nó gần như luôn được dùng cùng boundary value analysis.

> Ý chính: chia đầu vào thành các nhóm mà hệ thống xử lý giống nhau, cả hợp lệ và không hợp lệ, rồi test một giá trị của mỗi nhóm.
