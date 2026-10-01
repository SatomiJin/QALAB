Người dùng không quan tâm tới từng field riêng lẻ: họ muốn đạt một mục tiêu, như rút tiền hay đặt hàng. Một **use case** mô tả từng bước actor đạt mục tiêu đó ra sao, kể cả chuyện gì xảy ra khi mọi thứ diễn ra khác đi hoặc bị lỗi. **Use case testing** biến từng luồng đó thành test.

## Các thành phần của use case

| Thành phần | Ý nghĩa | Ví dụ ATM |
|---|---|---|
| **Actor** | Ai tương tác với hệ thống: một người hoặc một hệ thống khác | Khách hàng của ngân hàng, hệ thống core ngân hàng |
| **Goal** (mục tiêu) | Actor muốn gì | Rút tiền mặt |
| **Precondition** (điều kiện trước) | Điều phải đúng từ trước | Thẻ hợp lệ, ATM đang hoạt động |
| **Main flow** (luồng chính) | Đường đi bình thường, phổ biến nhất tới mục tiêu | Đưa thẻ, nhập PIN, chọn số tiền, nhận tiền |
| **Alternative flow** (luồng thay thế) | Đường đi khác mà **vẫn đạt** mục tiêu | Chọn số tiền khác, yêu cầu in biên lai |
| **Exception flow** (luồng ngoại lệ) | Đường đi mà mục tiêu **không đạt được** | Sai PIN, không đủ số dư |
| **Postcondition** (điều kiện sau) | Điều đúng ở cuối | Số dư giảm đúng bằng số tiền rút |

## Ví dụ: rút tiền mặt

**Main flow:**

1. Khách đưa thẻ vào.
2. ATM yêu cầu PIN; khách nhập PIN.
3. ATM kiểm tra PIN với hệ thống ngân hàng.
4. Khách chọn 100 USD.
5. Hệ thống ngân hàng kiểm tra số dư và chấp thuận.
6. ATM trả thẻ, rồi nhả tiền.

**Alternative flow:**

* 4a. Khách nhập số tiền tùy chọn thay vì chọn mức có sẵn.
* 6a. Khách yêu cầu biên lai; ATM in biên lai.

**Exception flow:**

* 3a. Sai PIN: ATM yêu cầu nhập lại; sau lần sai PIN thứ ba, ATM giữ thẻ.
* 5a. Không đủ số dư: ATM hiện thông báo, không nhả tiền, số dư không đổi.
* 6b. ATM hết tiền: giao dịch bị hủy và không bị trừ tiền.

## Rút ra test

* **Một test cho main flow.** Nó chứng minh hành trình phổ biến nhất chạy trọn vẹn từ đầu đến cuối.
* **Một test cho mỗi alternative flow.** Mỗi luồng rời main flow ở bước của nó rồi quay lại.
* **Một test cho mỗi exception flow.** Expected result kiểm tra cả những gì người dùng thấy **và** những gì không được xảy ra: không nhả tiền, không trừ tiền, không rơi vào state sai.
* **Kiểm tra postcondition,** không chỉ màn hình cuối cùng: sau khi rút 100 USD, số dư tài khoản phải thấp hơn đúng 100 USD.

Use case cũng kết hợp tốt với các kỹ thuật khác: số tiền ở bước 4 là một field để áp dụng EP và BVA, ba lần sai PIN ở 3a là một mô hình state transition.

## Viết test từ một luồng

Với exception 5a, test case có thể như sau:

* **Precondition:** số dư tài khoản 50 USD, ATM đang hoạt động, thẻ hợp lệ.
* **Steps:** đưa thẻ, nhập đúng PIN, chọn 100 USD.
* **Expected result:** hiện thông báo "Insufficient funds", không nhả tiền, thẻ được trả lại, số dư vẫn là 50 USD.

Precondition giúp exception xảy ra có chủ đích: bạn phải chuẩn bị số dư thấp hơn số tiền rút, không thể chờ nó tình cờ xảy ra.

## Mẹo

* Exception là nơi dễ có defect nhất, vì developer thường nghĩ tới main flow trước. Hãy dành thời gian thật sự cho chúng.
* Nếu use case không có exception flow nào, đó là một phát hiện khi review: hãy hỏi chuyện gì xảy ra khi thẻ bị từ chối, mất mạng, hay người dùng bấm quay lại.
* Use case mô tả hành vi hệ thống từ phía người dùng, nên chúng cũng là nền tảng tốt cho acceptance test.

> Ý chính: một test cho main flow, một test cho mỗi alternative flow và exception flow, và luôn kiểm tra những gì không được xảy ra trong exception.
