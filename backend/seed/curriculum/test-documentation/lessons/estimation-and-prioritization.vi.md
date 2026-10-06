Có hai câu hỏi luôn xuất hiện trong buổi lập kế hoạch: *kiểm thử mất bao lâu?* và *chạy test nào trước?* Bài này nói về cách tester tham gia lập kế hoạch release và iteration, bốn cách ước lượng công sức kiểm thử, và ba cách sắp thứ tự test case.

## Tester trong release planning và iteration planning

Trong phát triển kiểu iterative có hai loại lập kế hoạch:

| | Release planning | Iteration planning |
|---|---|---|
| Nhìn tới | Bản release của sản phẩm | Cuối một iteration (sprint) |
| Làm việc với | Product backlog: chia story lớn thành các story nhỏ hơn | Iteration backlog |
| Tester | Giúp viết story và acceptance criteria test được, tham gia phân tích rủi ro, ước lượng công sức test cho từng story, quyết định test approach và lập kế hoạch test cho release | Tham gia phân tích rủi ro chi tiết của các story, kiểm tra khả năng test, chia story thành task (nhất là task kiểm thử), ước lượng chúng, và làm rõ các khía cạnh functional và non-functional |

## Ước lượng công sức kiểm thử

Ước lượng là một dự đoán, dựa trên các **giả định**, và luôn có sai số: hãy nói rõ điều đó khi đưa ra con số. Việc nhỏ ước lượng chính xác hơn việc lớn, nên hãy **chia nhỏ việc lớn** rồi ước lượng từng phần.

| Kỹ thuật | Dựa trên | Cách làm |
|---|---|---|
| **Ratios** (tỉ lệ) | Số liệu từ các dự án trước của tổ chức | Dùng một tỉ lệ lịch sử, chẳng hạn công sức phát triển so với công sức kiểm thử |
| **Extrapolation** (ngoại suy) | Số liệu của dự án hiện tại | Đo sớm, rồi suy ra cho phần còn lại, ví dụ lấy trung bình các iteration gần nhất |
| **Wideband Delphi** | Chuyên gia | Từng chuyên gia ước lượng riêng; các con số chênh nhau nhiều được đem ra thảo luận; lặp lại đến khi thống nhất. **Planning Poker** là biến thể dùng trong Agile, với các lá bài đánh số |
| **Three-point estimation** (ước lượng ba điểm) | Chuyên gia | Ước lượng giá trị lạc quan (a), khả dĩ nhất (m) và bi quan (b); E = (a + 4m + b) ÷ 6, với độ lệch chuẩn SD = (b − a) ÷ 6 |

Ví dụ:

* **Ratios**: ở ba bản release gần nhất, kiểm thử mất khoảng một nửa công sức phát triển. Phát triển ước lượng 40 ngày công, vậy kiểm thử khoảng 20 ngày công.
* **Extrapolation**: kiểm thử mất 6, 8 và 7 ngày ở ba sprint gần nhất, vậy lên kế hoạch khoảng 7 ngày cho sprint tới.
* **Three-point**: kiểm thử luồng checkout mới được ước lượng a = 4, m = 7, b = 16 ngày công. E = (4 + 28 + 16) ÷ 6 = 8 và SD = (16 − 4) ÷ 6 = 2, nên ước lượng là **8 ± 2 ngày công** (từ 6 đến 10).

Số liệu lịch sử của chính tổ chức thường là nguồn tốt nhất cho ratios: số liệu của công ty khác hiếm khi khớp.

## Sắp thứ tự ưu tiên test case

Khi test case đã được gom thành suite, một **test execution schedule** (lịch thực thi) sắp xếp thứ tự chạy. Ba chiến lược phổ biến:

| Chiến lược | Chạy trước | Ví dụ |
|---|---|---|
| **Risk-based** | Test cover các rủi ro cao nhất (theo phân tích rủi ro) | Test thanh toán và giảm giá trước link ở footer |
| **Coverage-based** | Test đạt coverage cao nhất, chẳng hạn statement coverage; ở biến thể *additional coverage*, test tiếp theo là test thêm được nhiều coverage mới nhất | Test checkout end-to-end trước, rồi đến các test cover phần nó bỏ sót |
| **Requirements-based** | Test cho các requirement có độ ưu tiên cao nhất, do các bên liên quan đặt | Product owner xếp "thanh toán bằng thẻ" trên "lưu để mua sau" |

Hai giới hạn thực tế:

* **Phụ thuộc**: nếu một test ưu tiên cao cần một test ưu tiên thấp chạy trước (không thể test "hủy đơn" khi "đặt đơn" chưa chạy được), test ưu tiên thấp phải chạy trước.
* **Nguồn lực**: test cần payment sandbox, một thiết bị đặc biệt hay một người cụ thể phải chạy vào lúc những thứ đó sẵn sàng.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 5.1.2 "Tester's contribution to iteration and release planning", 5.1.4 "Estimation techniques" và 5.1.5 "Test case prioritization". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus; các con số trong ví dụ do team tự đặt.

> Ý chính: tester tham gia lập kế hoạch release và iteration. Ước lượng bằng ratios, extrapolation, Wideband Delphi hoặc three-point estimation, và nói rõ các giả định; sắp thứ tự test theo rủi ro, coverage hoặc độ ưu tiên của requirement, đồng thời tôn trọng các phụ thuộc và nguồn lực.
