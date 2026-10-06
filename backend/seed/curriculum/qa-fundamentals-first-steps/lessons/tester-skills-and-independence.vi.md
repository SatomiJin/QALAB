Biết kỹ thuật test mới chỉ là một phần công việc. Tester còn cần những thói quen tư duy phù hợp, làm việc bên trong một nhóm, và phải mang góc nhìn từ bên ngoài mà không biến thành người ngoài cuộc. Bài này nói về các kỹ năng tester cần, **whole team approach** (cách tiếp cận cả nhóm) và **tính độc lập của kiểm thử** (independence of testing).

## Những kỹ năng tester cần

| Kỹ năng | Vì sao quan trọng | Ví dụ |
|---|---|---|
| Kiến thức kiểm thử | Kỹ thuật test làm test hiệu quả hơn | Dùng boundary value thay vì số ngẫu nhiên |
| Kỹ lưỡng, tò mò, chú ý chi tiết | Defect khó tìm nấp trong chi tiết | Để ý tổng tiền trên hóa đơn bị làm tròn khác |
| Giao tiếp, lắng nghe chủ động, làm việc nhóm | Kết quả vô dụng nếu không ai hiểu hay chấp nhận | Giải thích bug để developer tái hiện được ngay |
| Tư duy phân tích, phản biện, sáng tạo | Để thấy cái có thể sai mà chưa ai viết ra | "Nếu hai người dùng cùng một voucher cùng lúc thì sao?" |
| Kiến thức kỹ thuật | Công cụ giúp test nhanh hơn | Đọc API response, viết câu SQL, dùng DevTools của trình duyệt |
| Kiến thức nghiệp vụ | Để hiểu người dùng và nói chuyện với phía business | Biết hoàn tiền trong thương mại điện tử hoạt động ra sao |

## Báo tin xấu cho khéo

Tester thường là người mang tin xấu, và người ta hay trách người đưa tin. Một bug report có thể bị cảm nhận như lời chê công việc của developer; **confirmation bias** (thiên kiến xác nhận) khiến ai cũng khó chấp nhận bằng chứng trái với điều mình tin ("máy tôi chạy được mà"). Có người còn xem kiểm thử là hoạt động phá hoại.

Vì vậy cách bạn báo cáo cũng quan trọng như điều bạn tìm thấy:

* Mô tả hành vi của sản phẩm, đừng nói về con người: "tổng tiền bỏ qua giảm giá", không phải "bạn quên giảm giá".
* Mang theo bằng chứng: các bước, dữ liệu, ảnh chụp màn hình, log.
* Tin rằng người khác có thiện ý và nhấn vào mục tiêu chung: một sản phẩm tốt hơn cho người dùng.
* Nói cả những gì đang chạy tốt.

## Whole team approach

Trong **whole team approach** (một thực hành từ Extreme Programming), ai có kỹ năng phù hợp cũng có thể làm bất kỳ việc gì và **ai cũng chịu trách nhiệm về chất lượng**. Nhóm làm việc trong một không gian chung, thật hoặc ảo, để trao đổi nhanh. Với tester, điều đó có nghĩa là:

* giúp Product Owner viết acceptance test,
* thống nhất test strategy và cách làm automation với developer,
* chia sẻ kiến thức kiểm thử để developer tự test tốt hơn.

Không phải lúc nào nó cũng là lựa chọn đúng: chẳng hạn hệ thống an toàn tối quan trọng (safety-critical) có thể đòi hỏi mức kiểm thử **độc lập** cao.

## Tính độc lập của kiểm thử

Con người rất dở trong việc tìm lỗi của chính mình, vì chính những giả định tạo ra lỗi cũng che giấu nó. Một mức độ độc lập nhất định sẽ giúp ích, dù developer vẫn tìm được hiệu quả nhiều defect trong code của mình.

| Ai test | Mức độc lập | Ví dụ |
|---|---|---|
| Chính tác giả | Không có | Developer chạy unit test của mình |
| Đồng nghiệp cùng nhóm | Một phần | Một developer khác review pull request |
| Tester ngoài nhóm, cùng tổ chức | Cao | Nhóm QA trung tâm chạy system test |
| Tester ngoài tổ chức | Rất cao | Một công ty bên ngoài làm security audit |

Hầu hết dự án kết hợp nhiều mức: developer làm component test và component integration test, tester làm system test và system integration test, đại diện phía business làm acceptance test.

| Lợi ích của tính độc lập | Hạn chế |
|---|---|
| Nền tảng và thiên kiến khác nhau tìm ra defect khác nhau | Tách biệt khỏi nhóm phát triển, giao tiếp kém |
| Có thể chất vấn và bác bỏ giả định của các bên liên quan | Quan hệ kiểu "phe ta, phe họ" |
| | Developer có thể không còn thấy mình chịu trách nhiệm về chất lượng |
| | Tester bị xem là nút thắt cổ chai hoặc bị đổ lỗi khi release trễ |

Kỹ năng ở đây là giữ được góc nhìn độc lập trong khi vẫn ở bên trong nhóm.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.5 "Essential skills and good practices in testing" (1.5.1–1.5.3). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: một tester giỏi kết hợp kiến thức kiểm thử với sự tò mò, tư duy phản biện và cách giao tiếp mang tính xây dựng. Trong whole team approach ai cũng sở hữu chất lượng; tính độc lập giúp tìm ra những defect khác, nhưng quá độc lập sẽ cô lập tester, nên hầu hết dự án kết hợp nhiều mức.
