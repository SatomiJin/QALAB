Khi đã biết *nên* tự động hóa cái gì, câu hỏi tiếp theo là *ở đâu*: cùng một quy tắc thường có thể được kiểm tra qua UI, qua API, hoặc trực tiếp trong code. **Automation pyramid** (kim tự tháp automation, còn gọi là test pyramid) là một mô hình đơn giản để phân bổ test giữa các tầng đó, giúp bộ test luôn nhanh, rẻ và đáng tin.

## Ba tầng

```text
        /\
       /UI\         few: whole user journeys through the browser
      /----\
     / API  \       more: services and endpoints, no browser
    /--------\
   /   Unit   \     most: functions and classes in isolation
  /------------\
```

| Tầng | Kiểm tra gì | Tốc độ | Chi phí viết và bảo trì | Khi fail, bạn biết… |
| --- | --- | --- | --- | --- |
| **Unit** | Một hàm hoặc một class, các phụ thuộc được thay thế | Mili giây | Thấp | Chính xác hàm nào sai |
| **API / service** | Một endpoint hoặc service với logic và database thật | Vài chục đến vài trăm mili giây | Trung bình | Endpoint nào và quy tắc nào |
| **UI / end-to-end** | Một hành trình người dùng qua giao diện thật | Vài giây mỗi test | Cao | Có gì đó trong hành trình bị hỏng, ở đâu đó |

Càng lên cao, test càng bao phủ nhiều phần của hệ thống thật, nên cho bạn nhiều **sự tin cậy** hơn rằng các mảnh ghép hoạt động cùng nhau. Nhưng nó cũng chậm hơn, mong manh hơn (nhiều bộ phận có thể hỏng hoặc chậm) và khó debug hơn.

## Vì sao hình dạng quan trọng

Kim tự tháp nói rằng: **nhiều** test nhỏ, nhanh ở đáy, và **ít dần** ở mỗi tầng phía trên.

Lấy ví dụ quy tắc: "đơn hàng từ 50 USD được miễn phí vận chuyển".

* **Unit**: test hàm `shippingCost(total)` với 49.99, 50.00 và 50.01. Hàng trăm phép kiểm tra như vậy chạy trong một giây.
* **API**: một hai lời gọi `POST /orders` để chứng minh endpoint dùng đúng hàm đó và lưu đúng số tiền.
* **UI**: một hành trình checkout hiển thị "Free shipping" trên trang, để chứng minh màn hình hiển thị đúng những gì API trả về.

Test mọi boundary value (giá trị biên) qua UI vẫn được, nhưng sẽ mất vài phút thay vì vài mili giây, và vỡ mỗi khi một nút bị dời chỗ.

Một quy tắc dễ nhớ: **kiểm tra mỗi quy tắc ở tầng thấp nhất có thể bắt được bug**, và dùng tầng cao hơn cho những gì chỉ tầng đó thấy được (sự tích hợp giữa các phần, thứ người dùng thực sự nhìn thấy).

## Anti-pattern cây kem ốc quế

Nhiều team cuối cùng có một kim tự tháp lộn ngược:

```text
  \--------------/
   \  manual    /    lots of manual regression
    \----------/
     \  UI    /      most automated tests are UI tests
      \------/
       \API /        few API tests
        \--/
         \/          almost no unit tests
```

Đây là **ice-cream cone** (cây kem ốc quế). Nó thường xảy ra khi QA tự động hóa bằng cách ghi lại những gì tester làm thủ công trên trình duyệt, còn developer không viết unit test. Triệu chứng:

* Bộ test chạy mất một giờ, nên chỉ chạy hằng đêm thay vì ở mỗi pull request.
* Test fail vì vấn đề thời gian hay một nhãn bị đổi chứ không phải vì bug, nên mọi người thôi tin vào build đỏ.
* Một lần fail chỉ nói "checkout test failed" và ai đó mất cả giờ để tìm ra lý do.

Đưa các phép kiểm tra xuống thấp trong kim tự tháp (một UI test trở thành một API test cộng một unit test) thường là cải thiện lớn nhất bạn có thể làm cho bộ test.

## Ai viết gì

Kim tự tháp là việc của cả team. Developer thường viết unit test; QA engineer thường phụ trách API automation và UI automation, và xem xét các tầng có cân bằng không. Một QA engineer đọc được unit test và nói được "quy tắc này đã được kiểm tra ở tầng dưới rồi, không cần UI test cho từng trường hợp" sẽ tiết kiệm cho team rất nhiều thời gian.

## Đây là mô hình, không phải định luật

Tỉ lệ cụ thể tùy vào sản phẩm. Một ứng dụng chủ yếu là màn hình mỏng phía trên API của bên thứ ba có thể có ít unit test và nhiều API test hơn (đôi khi được vẽ thành hình "chiếc cúp" phình ở giữa). Nguyên tắc vẫn giữ nguyên: ưu tiên test nhanh nhất, chính xác nhất có thể bắt được bug, và để dành test chậm, bao quát cho những hành trình quan trọng nhất.

> Ý chính: nhiều unit test nhanh, ít API test hơn, một nhóm nhỏ hành trình UI; tránh hình cây kem ốc quế, nơi UI test chậm và test thủ công gánh mọi thứ.
