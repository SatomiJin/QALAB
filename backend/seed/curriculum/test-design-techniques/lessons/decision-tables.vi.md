Có những requirement không nói về một field mà nói về **tổ hợp**: "thành viên được giảm giá, đơn lớn được miễn phí giao hàng, trừ khi…". Test chúng theo cảm tính thì luôn sót tổ hợp. Một **decision table** (bảng quyết định) liệt kê mọi tổ hợp điều kiện và hành động hệ thống phải thực hiện với từng tổ hợp, để không bỏ sót gì.

## Các thành phần của decision table

| Thành phần | Là gì | Ví dụ |
|---|---|---|
| **Condition** (điều kiện) | Đầu vào hoặc sự kiện đúng/sai | Khách là thành viên Premium |
| **Action** (hành động) | Việc hệ thống làm | Miễn phí giao hàng |
| **Rule** (quy tắc) | Một cột = một tổ hợp điều kiện cùng các action của nó | Thành viên = Có, Tổng ≥ 100 = Không → giảm 5 % |

Với các điều kiện có/không, số tổ hợp là **2 mũ số điều kiện**: 2 điều kiện cho 4 rule, 3 điều kiện cho 8, 4 điều kiện cho 16. Mỗi rule trở thành ít nhất một test case.

## Ví dụ: giảm giá của cửa hàng

Requirement: *"Đơn từ 100 USD trở lên được miễn phí giao hàng. Thành viên Premium luôn được miễn phí giao hàng và giảm 5 %."*

| | Rule 1 | Rule 2 | Rule 3 | Rule 4 |
|---|---|---|---|---|
| C1: Thành viên Premium | Y | Y | N | N |
| C2: Tổng ≥ 100 USD | Y | N | Y | N |
| A1: Miễn phí giao hàng | X | X | X | - |
| A2: Giảm 5 % | X | X | - | - |

Cách xây dựng:

1. **Liệt kê các điều kiện** từ requirement (ở đây là hai).
2. **Viết mọi tổ hợp.** Xen kẽ Y/N ở hàng cuối, theo cặp ở hàng trên nó, cứ thế tiếp tục, để không tổ hợp nào bị lặp hay bị thiếu.
3. **Điền action** cho từng rule theo requirement. Nếu bạn không quyết định được action, bạn vừa tìm ra một lỗ hổng trong requirement: hãy hỏi trước khi test.
4. **Viết một test cho mỗi rule**, ví dụ rule 4: khách không phải thành viên đặt đơn 60 USD → trả phí giao hàng, không được giảm giá.

Những tổ hợp như rule 2 (thành viên, đơn nhỏ) chính là thứ mà kiểu test tùy hứng hay quên.

## Rút gọn bảng

Khi hai rule có **cùng các action** và chỉ khác nhau ở **một điều kiện**, điều kiện đó không ảnh hưởng tới chúng. Gộp chúng thành một rule và ghi "-" (don't care, không quan trọng) cho điều kiện đó.

Rule 1 và 2 ở trên đều cho miễn phí giao hàng và giảm 5 %, chỉ khác nhau ở C2. Sau khi rút gọn:

| | Rule 1+2 | Rule 3 | Rule 4 |
|---|---|---|---|
| C1: Thành viên Premium | Y | N | N |
| C2: Tổng ≥ 100 USD | - | Y | N |
| A1: Miễn phí giao hàng | X | X | - |
| A2: Giảm 5 % | X | - | - |

Ba test thay vì bốn. Chỉ rút gọn khi bạn chắc chắn điều kiện đó thực sự không tạo ra khác biệt; ở vùng rủi ro cao, hãy test bảng đầy đủ.

## Tổ hợp không thể xảy ra

Có những tổ hợp không thể xảy ra: một người không thể vừa "dưới 18 tuổi" vừa "trên 65 tuổi". Đánh dấu các rule đó là không thể xảy ra và đừng bịa test cho chúng. Nhưng hãy cẩn thận: "không thể" trong requirement chưa chắc là không thể trong hệ thống. Một form cho người dùng nhập cả hai giá trị vẫn có thể chấp nhận tổ hợp đó; việc này có thể đáng một negative test.

## Decision table hữu ích ở đâu

* Quy tắc giá, giảm giá, thuế và phí giao hàng.
* Điều kiện đủ tư cách: khoản vay, bảo hiểm, quyền truy cập.
* Logic của form: field xuất hiện hoặc trở thành bắt buộc tùy theo field khác.

Chúng còn cải thiện chính requirement. Việc điền cột action thường làm lộ ra những tổ hợp chưa ai đặc tả, và phát hiện điều đó trước khi code là defect rẻ nhất bạn từng báo cáo.

> Ý chính: liệt kê mọi tổ hợp điều kiện cùng các action mong đợi, chỉ rút gọn những rule mà điều kiện thật sự không quan trọng, và test từng rule.
