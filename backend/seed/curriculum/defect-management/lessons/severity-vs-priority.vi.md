Mỗi bug report mang hai mức đánh giá, và người mới thường coi chúng là một. Chúng trả lời hai câu hỏi khác nhau: **severity** (mức độ nghiêm trọng) hỏi *bug này gây hại cho hệ thống đến mức nào?*, **priority** (độ ưu tiên) hỏi *phải sửa nó sớm đến đâu?* Phần lớn thời gian hai giá trị đi cùng nhau, nhưng những bug đáng chú ý lại là những bug mà chúng lệch nhau.

## Severity: mức ảnh hưởng lên hệ thống

Severity mô tả tác động của failure lên sản phẩm và người dùng, bất kể deadline hay kế hoạch kinh doanh. Ứng dụng này dùng bốn mức:

| Severity | Ý nghĩa | Ví dụ |
|---|---|---|
| Critical | Hệ thống hoặc một chức năng cốt lõi không dùng được, dữ liệu bị mất hoặc hỏng, có lỗ hổng bảo mật; không có workaround | Checkout crash với mọi đơn hàng; một API trả về dữ liệu của người dùng khác |
| Major | Một chức năng quan trọng lỗi hoặc cho kết quả sai; có workaround hoặc chỉ một phần người dùng bị ảnh hưởng | Mã giảm 15 % chỉ được áp 10 %; tìm kiếm bỏ qua bộ lọc danh mục |
| Minor | Một chức năng nhỏ hoạt động sai; workaround dễ, ảnh hưởng ít | Sắp xếp theo ngày bỏ qua giờ; file `.JPG` bị từ chối nhưng `.jpg` thì được |
| Trivial | Lỗi thẩm mỹ: không ảnh hưởng đến cách hệ thống hoạt động | Lỗi chính tả trong nhãn, icon lệch, sai sắc độ màu xám |

Severity chủ yếu là **đánh giá kỹ thuật**. Tester đề xuất nó khi báo bug, vì tester là người thấy failure và tác động của nó; developer và test lead có thể điều chỉnh lại.

## Priority: mức khẩn cấp của việc sửa

Priority mô tả thứ tự sửa bug, dựa trên nhu cầu kinh doanh: ngày release, số khách hàng bị ảnh hưởng, hợp đồng, uy tín.

| Priority | Ý nghĩa |
|---|---|
| High | Sửa ngay hoặc trước bản release kế tiếp; việc khác phải chờ |
| Medium | Sửa theo nhịp làm việc bình thường, ví dụ trong sprint tới |
| Low | Sửa khi có thời gian; có thể hoãn lại |

Priority là **quyết định kinh doanh**. Tester có thể gợi ý, nhưng product owner, project manager hoặc buổi triage mới là bên quyết định, vì họ nắm kế hoạch và khách hàng.

## Các tổ hợp kinh điển

| | Priority cao | Priority thấp |
|---|---|---|
| **Severity cao** | Trang thanh toán crash với mọi người dùng trên production | App crash khi xuất báo cáo ở một định dạng cũ mà chỉ một người dùng nội bộ mở mỗi năm một lần |
| **Severity thấp** | Tên công ty bị viết sai trên trang chủ một ngày trước khi ra mắt | Tooltip trên một trang admin hiếm khi dùng có lỗi chính tả |

Hai trường hợp nằm chéo là những trường hợp cần nhớ:

* **Severity cao, priority thấp**: thiệt hại là thật, nhưng xảy ra ở chỗ gần như không ai tới, hoặc tính năng sẽ bị gỡ bỏ vào tháng sau. Bug vẫn được ghi trung thực là critical hoặc major, và được xếp lịch sửa sau.
* **Severity thấp, priority cao**: về kỹ thuật không có gì hỏng, nhưng tác động kinh doanh lớn: tên thương hiệu viết sai, giá sai trên banner quảng cáo, thiếu văn bản pháp lý trước một đợt kiểm tra. Bug là trivial hoặc minor, nhưng vẫn phải sửa ngay hôm nay.

## Những lỗi hay gặp

* **Dùng cái này để suy ra cái kia.** "Nó critical nên priority là high" là bỏ qua câu hỏi. Hãy đánh giá từng cái riêng.
* **Thổi phồng severity để được chú ý.** Nếu bug nào cũng critical, từ đó mất hết ý nghĩa và các bug critical thật phải xếp hàng chờ. Hãy đánh giá ảnh hưởng trung thực, và thuyết phục về priority một cách riêng biệt.
* **Đánh giá severity theo công sức sửa.** Bug sửa một dòng vẫn có thể là critical; bug khó sửa vẫn có thể là trivial.
* **Quên rằng priority thay đổi.** Một bug priority thấp có thể thành cao khi một khách hàng lớn bắt đầu dùng tính năng đó. Severity chỉ thay đổi khi chính mức ảnh hưởng thay đổi.

## Cách quyết định nhanh

Với severity, hãy hỏi: *Nó có chặn một chức năng cốt lõi không? Có làm mất hay lộ dữ liệu không? Có workaround không? Bao nhiêu người dùng có thể gặp?* Với priority, hãy hỏi: *Khi nào release? Ai bị ảnh hưởng và lỗi có dễ thấy không? Mỗi ngày bug còn tồn tại, doanh nghiệp mất gì?*

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 5.5 "Defect management" (severity là mức độ ảnh hưởng, priority là mức ưu tiên sửa). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: severity là mức ảnh hưởng lên hệ thống, chủ yếu do tester đánh giá; priority là mức khẩn cấp của việc sửa, do phía kinh doanh quyết định. Luôn đánh giá chúng riêng biệt.
