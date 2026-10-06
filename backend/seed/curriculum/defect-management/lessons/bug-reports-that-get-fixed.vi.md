Một bug report phải cạnh tranh sự chú ý với hàng chục report khác. Những report được sửa nhanh đều có điểm chung: developer đọc trong một phút, tái hiện được vấn đề ngay lần đầu và tin được những gì report viết. Bài này tổng hợp những thói quen giúp làm được điều đó.

## Mỗi report một bug

Mỗi report mô tả **một** vấn đề. "Checkout: tổng tiền sai, nút Pay bị lệch và email xác nhận không bao giờ tới" là ba bug. Gộp chung thì không thể giao cho ba người, sửa ở các bản release khác nhau hay đóng từng cái một. Nếu bạn không chắc hai triệu chứng có chung nguyên nhân hay không, hãy viết hai report và liên kết chúng với nhau.

## Sự thật, không phải ý kiến

Developer hành động dựa trên sự thật. Ý kiến, phỏng đoán và cảm xúc làm report dài hơn và kém đáng tin hơn.

| Ý kiến hoặc phỏng đoán | Sự thật |
|---|---|
| Tìm kiếm chậm kinh khủng | Tìm "shoes" mất 8–9 giây; requirement là dưới 2 giây |
| Chắc backend cache sai | Sau khi đổi giá thành 25.00, trang sản phẩm vẫn hiển thị 20.00 trong 10 phút |
| Bug này tệ quá, người dùng sẽ ghét lắm | Cả 3 tài khoản test đều gặp lỗi; nó chặn checkout |
| Không chạy | `POST /api/orders` trả về `500` với `{"error":"Internal Server Error"}` |

Nếu bạn có giả thuyết về nguyên nhân, hãy ghi vào một dòng **Notes** riêng, nói rõ đó là phỏng đoán.

## Tỷ lệ tái hiện

Không phải bug nào cũng xảy ra mọi lần. Hãy ghi rõ nó xảy ra thường xuyên đến đâu, và bạn đã thử trong điều kiện nào:

* **Always (10/10)**: trường hợp bình thường; các bước là đủ.
* **Intermittent (3/10 — chập chờn)**: ghi tỷ lệ, thời điểm thử và bất cứ điểm khác biệt nào giữa lần lỗi và lần chạy đúng (mạng, dữ liệu, tài khoản).
* **Once (một lần)**: vẫn báo nếu ảnh hưởng nghiêm trọng, nói rõ bạn chưa tái hiện lại được, và đính kèm mọi bằng chứng bạn có.

Một bug chập chờn mà không có tỷ lệ trông giống như bug không tái hiện được, và sẽ bị đóng đúng như vậy.

## Log và ảnh chụp màn hình

Bằng chứng biến "tôi đã thấy" thành "nó đây":

* **Ảnh chụp màn hình** cho mọi thứ liên quan đến giao diện, có khoanh hoặc tô chỗ lỗi.
* **Video quay màn hình** khi thứ tự thao tác hoặc thời điểm là quan trọng.
* **Console và tab network của trình duyệt** cho bug web: sao chép lỗi và request bị lỗi.
* **Request và response của API**: method, URL, header (bỏ token), body, status code. Một lệnh `curl` giúp developer chạy lại y hệt.
* **Log server hoặc log thiết bị** kèm timestamp, để developer tìm đúng các dòng tương ứng.

```text
POST /api/v1/orders  ->  500 Internal Server Error
time: 2026-03-14 10:42:07 UTC   request-id: 7f3c2a91
```

Xoá mật khẩu, token và dữ liệu cá nhân trước khi đính kèm bất cứ thứ gì.

## Tránh trùng lặp

Một bug trùng (duplicate) làm mất thời gian của mọi người: phải có ai đó nhận ra, liên kết và đóng nó. Trước khi báo:

1. Tìm trong công cụ quản lý bug theo khu vực và từ khoá của triệu chứng ("discount", "SAVE15", "checkout total").
2. Xem cả những bug mới đóng gần đây: vấn đề có thể đã được sửa ở build mới hơn, hoặc đây là một regression.
3. Nếu bug đã tồn tại, hãy **bổ sung thông tin** của bạn vào đó (môi trường mới, các bước rõ hơn, một đoạn log) thay vì mở report mới.

## Checklist nhanh

Trước khi bấm *Create*, hãy kiểm tra rằng:

* title nói rõ cái gì sai, ở đâu và khi nào;
* các bước bắt đầu từ một trạng thái rõ ràng và chỉ chứa những gì cần thiết;
* actual result và expected result cụ thể;
* severity và priority được đánh giá riêng biệt;
* có environment, tỷ lệ tái hiện và bằng chứng;
* đây là một bug duy nhất, và chưa ai báo.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.5.1 (trao đổi về defect một cách xây dựng) và 5.5 "Defect management". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus.
* Checklist và lời khuyên về tỉ lệ tái hiện, bug trùng và bằng chứng là cách làm phổ biến, do team QALAB tự viết.

> Ý chính: một report được sửa khi nó dễ tin và dễ tái hiện: một bug, chỉ có sự thật, có tỷ lệ tái hiện, có bằng chứng, và không trùng lặp.
