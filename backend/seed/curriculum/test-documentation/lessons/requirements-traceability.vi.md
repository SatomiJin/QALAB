Viết test case tốt thôi chưa đủ: bạn còn cần chứng minh **mọi requirement** đều được ít nhất một test case bao phủ, và biết requirement nào bị ảnh hưởng khi có thứ gì fail hoặc thay đổi. Mối liên kết giữa requirement và test đó gọi là **traceability** (khả năng truy vết), và công cụ thường dùng là **requirements traceability matrix (RTM)** (ma trận truy vết requirement).

## Traceability mang lại gì

* **Coverage (độ bao phủ):** bạn chứng minh được mỗi requirement đều có test, và phát hiện những requirement chưa có.
* **Ảnh hưởng:** khi một requirement thay đổi, bạn biết chính xác test case nào cần cập nhật và chạy lại.
* **Trạng thái theo requirement:** product owner hỏi "đặt lại mật khẩu đã sẵn sàng chưa?", chứ không hỏi "TC-047 pass chưa?". RTM trả lời bằng ngôn ngữ của họ.
* **Không có việc mồ côi:** một test case không gắn với requirement nào thì hoặc đang test thứ không ai yêu cầu, hoặc để lộ một requirement chưa từng được viết ra.

## RTM

RTM là một bảng, mỗi dòng là một requirement. Bản đơn giản nằm gọn trong một bảng tính; các công cụ quản lý test tự dựng RTM từ liên kết giữa story và test case.

| Requirement | Mô tả | Test case | Kết quả gần nhất | Defect |
|---|---|---|---|---|
| REQ-01 | Đăng nhập bằng email và mật khẩu | TC-01, TC-02 | Pass | — |
| REQ-02 | Hiện thông báo lỗi chung khi sai thông tin đăng nhập | TC-03 | Fail | BUG-112 |
| REQ-03 | Đặt lại mật khẩu qua link trong email | TC-04, TC-05 | Not run | — |
| REQ-04 | Khóa tài khoản 15 phút sau 5 lần đăng nhập thất bại | — | — | — |
| REQ-05 | "Remember me" giữ phiên đăng nhập 30 ngày | TC-06 | Blocked | BUG-115 |

Đọc từng dòng. REQ-01 được bao phủ và đang pass. REQ-02 được bao phủ nhưng đang fail, có bug liên kết. REQ-03 được bao phủ nhưng chưa có kết quả. REQ-04 **không có test case nào**: nó chưa được test. REQ-05 được bao phủ nhưng bị blocked.

## Truy vết xuôi và ngược

| Chiều | Câu hỏi | Tìm ra |
|---|---|---|
| Forward (requirement → test) | Mọi requirement đều có test chưa? | Requirement chưa được test (REQ-04) |
| Backward (test → requirement) | Mọi test đều thuộc về một requirement chưa? | Test mồ côi, requirement bị thiếu hoặc đã lỗi thời |
| Bidirectional (hai chiều) | Cả hai | Bức tranh đầy đủ, và ảnh hưởng của thay đổi theo cả hai chiều |

Nhiều team còn truy vết thêm một bước: test case → defect. Khi đó dòng của mỗi requirement cho thấy các bug đang mở chặn nó hoàn thành.

## Đo coverage

**Requirements coverage** = số requirement có ít nhất một test case ÷ tổng số requirement. Trong bảng trên, 4 trên 5 requirement có test case: 80 %.

Coverage và kết quả là hai chuyện khác nhau. Coverage 80 % không nói gì về chất lượng: REQ-02 được bao phủ nhưng đang fail. Hãy báo cáo cả hai: bao phủ được bao nhiêu, và trong số đó bao nhiêu pass. Cũng nhớ rằng mỗi requirement một test case là mức tối thiểu, không phải mục tiêu. "Khóa tài khoản sau 5 lần thất bại" cần ít nhất lần thứ 4 (chưa khóa), lần thứ 5 (bị khóa) và lúc hết 15 phút (mở khóa lại).

## Phiên bản: configuration management

Liên kết chỉ có ích khi ai cũng biết nó trỏ tới **phiên bản nào** của từng thứ. **Configuration management** (quản lý cấu hình) định danh, quản lý phiên bản và theo dõi thay đổi của testware (test plan, test case, script, kết quả, log, báo cáo) cùng các test item như những **configuration item**. Khi một thứ, chẳng hạn môi trường test hay một build, được duyệt để test, nó trở thành một **baseline**: chỉ được thay đổi qua quy trình kiểm soát thay đổi, và có thể quay về baseline cũ để tái hiện kết quả trước đây. Vì vậy kết quả test luôn ghi rõ build ("Pass trên 2.4.0-rc2"), và requirement REQ-12 v2 được cập nhật cùng lúc với các test case của nó. Trong DevOps pipeline, phần lớn việc này được tự động hóa (version control, số build, môi trường có gắn tag).

## Tìm requirement chưa được test

1. Liệt kê mọi requirement với ID ổn định (user story, acceptance criteria, đặc tả).
2. Gắn mỗi test case với các ID mà nó kiểm chứng, ngay khi viết, không đợi đến cuối.
3. Lọc RTM tìm các dòng không có test case. Mỗi dòng là một lỗ hổng: viết thêm case còn thiếu, hoặc ghi lại quyết định đưa nó ra ngoài phạm vi.
4. Lọc tìm các test case không có requirement. Hỏi xem có requirement nào bị thiếu không.
5. Khi requirement thay đổi, cập nhật dòng của nó và đánh dấu các test case liên quan cần xem lại.

Acceptance criteria thường giấu nhiều requirement trong một câu. "Người dùng có thể đặt lại mật khẩu, và link hết hạn sau 1 giờ" là hai dòng: đặt lại mật khẩu hoạt động, và link hết hạn.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 1.4.4 "Traceability between the test basis and testware" và 5.4 "Configuration management". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: RTM liên kết mỗi requirement với test case, kết quả và defect của nó. Đọc xuôi để tìm requirement chưa được test, đọc ngược để tìm test mồ côi, và báo cáo coverage tách biệt với trạng thái pass.
