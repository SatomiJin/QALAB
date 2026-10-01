Một tính năng chạy tốt với một tester có thể hỏng khi một nghìn khách hàng dùng nó cùng lúc. **Performance testing** (kiểm thử hiệu năng) kiểm tra hệ thống nhanh và ổn định đến mức nào dưới một mức tải nhất định. Nó cần công cụ (JMeter, k6, Gatling, Locust) và một môi trường sát thực tế, nhưng tester nào cũng nên hiểu các thuật ngữ, đọc được kết quả và biết nên hỏi những câu gì.

## Các loại chính

| Loại | Câu hỏi | Cách làm | Ví dụ |
|---|---|---|---|
| **Load testing** | Hệ thống có đạt mục tiêu ở mức tải dự kiến không? | Tăng dần tới số người dùng bình thường và cao điểm, giữ nguyên ở đó | 2 000 người dùng đang xem hàng và 200 người checkout mỗi phút |
| **Stress testing** | Hệ thống gãy ở đâu, và gãy như thế nào? | Tăng tải vượt quá mức tối đa dự kiến cho tới khi hỏng | Liên tục thêm người dùng cho tới khi xuất hiện lỗi; sau đó hệ thống có phục hồi không? |
| **Spike testing** | Hệ thống có chịu được một cú tăng đột ngột không? | Đi từ tải thấp lên tải rất cao trong vài giây | Flash sale bắt đầu lúc 12:00 và lượng truy cập tăng gấp 10 trong một phút |
| **Endurance (soak) testing** | Hệ thống có ổn định theo thời gian không? | Giữ mức tải bình thường trong nhiều giờ hoặc nhiều ngày | 8 giờ ở mức tải bình thường; bộ nhớ có tăng mãi không? |

Các loại liên quan khác: **scalability testing** (thêm server có làm tăng năng lực xử lý không?) và **volume testing** (lượng dữ liệu lớn, ví dụ một bảng có 50 triệu đơn hàng).

Stress testing không chỉ là tìm điểm gãy. Điều quan trọng là hệ thống hỏng **như thế nào**: một trang "vui lòng thử lại" rõ ràng và phục hồi hoàn toàn là chấp nhận được; mất đơn hàng hoặc hỏng dữ liệu thì không.

## Các chỉ số chính

* **Response time** (thời gian phản hồi): một request mất bao lâu, từ lúc gửi đến lúc nhận đủ câu trả lời. Đo theo từng giao dịch (đăng nhập, tìm kiếm, thanh toán).
* **Throughput** (thông lượng): lượng công việc hệ thống hoàn thành trong một đơn vị thời gian, ví dụ **request mỗi giây** hoặc số đơn hàng mỗi phút.
* **Error rate** (tỉ lệ lỗi): phần trăm request bị lỗi (timeout, status code 5xx).
* **Concurrent users** (người dùng đồng thời): bao nhiêu người dùng hoạt động cùng một lúc.
* **Resource use** (mức dùng tài nguyên): CPU, bộ nhớ, kết nối database, ổ đĩa. Giúp tìm ra **bottleneck** (nút thắt cổ chai), phần giới hạn cả hệ thống.

Khi tải tăng, throughput thường tăng tới một điểm, rồi đi ngang trong khi response time tăng vọt. Chỗ gãy khúc trên đường cong đó gần với năng lực thật của hệ thống.

## Vì sao số trung bình đánh lừa: percentile

Hãy tưởng tượng 100 request tìm kiếm: 95 request mất 200 ms và 5 request mất 8 giây. **Trung bình** khoảng 590 ms, nghe có vẻ ổn. Nhưng cứ 20 người dùng thì có 1 người phải chờ 8 giây.

**Percentile** mô tả điều này tốt hơn:

* **p50 (median — trung vị):** một nửa số request nhanh hơn giá trị này.
* **p95:** 95 % request nhanh hơn giá trị này; 5 % chậm hơn.
* **p99:** 99 % nhanh hơn; 1 % chậm nhất thì chậm hơn.

Một performance requirement tốt dùng percentile và mức tải: "Với 1 000 người dùng đồng thời, p95 response time của tìm kiếm dưới 1 giây và error rate dưới 1 %". Một requirement kiểu "trang web phải nhanh" thì không test được.

## Tester thủ công có thể làm gì

Kể cả khi không tự chạy load test, bạn vẫn có thể:

* yêu cầu performance requirement **đo được** trong buổi refinement (giao dịch nào, mức tải nào, percentile nào, giới hạn bao nhiêu);
* để ý và báo cáo các màn hình chậm trong lúc functional testing, kèm thời gian đo được (developer tools của trình duyệt hiển thị thời gian request ở tab Network);
* kiểm tra người dùng thấy gì khi hệ thống chịu tải: biểu tượng đang tải, timeout có thông báo rõ ràng, không bị tạo hai đơn hàng khi ai đó bấm **Pay** hai lần vì trang chậm;
* giúp thiết kế kịch bản sát thực tế: hành trình người dùng nào quan trọng và theo tỉ lệ nào (đa số chỉ xem hàng, ít người thanh toán);
* so sánh kết quả giữa các bản release: p95 tăng từ 400 ms lên 900 ms là một regression, dù vẫn "dưới 1 giây".

Performance test phải chạy trên môi trường gần với production về quy mô và dữ liệu. Kết quả đo trên laptop hoặc trên một database test trống nói rất ít về người dùng thật.

> Ý chính: load, stress, spike và endurance test đặt ra những câu hỏi khác nhau về cùng một hệ thống. Hãy đánh giá kết quả bằng percentile, throughput và error rate, đừng bao giờ chỉ dựa vào số trung bình.
