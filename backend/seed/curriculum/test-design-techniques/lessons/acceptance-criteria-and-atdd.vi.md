Các kỹ thuật khác trong khóa này tìm defect trong thứ đã có sẵn. **Các cách tiếp cận dựa trên cộng tác** (collaboration-based) cố gắng ngăn defect ngay từ lúc chưa được viết ra: phía business, developer và tester thống nhất các ví dụ cụ thể trước khi code. Bài này nói về cách cùng nhau viết một user story tốt, hai cách viết acceptance criteria, và cách **acceptance test-driven development (ATDD)** biến chúng thành test case.

## User story: 3 C

User story mô tả một tính năng có giá trị với người dùng hoặc người mua, thường theo dạng:

```text
As a <role>, I want <goal>, so that <business value>.
```

Một story có ba phần, gọi là **3 C**:

* **Card**: bản mô tả ngắn (một tấm thẻ, một mục trong backlog).
* **Conversation**: cuộc trao đổi về cách phần mềm sẽ được dùng, có thể ghi lại hoặc không.
* **Confirmation**: acceptance criteria cho biết khi nào story hoàn thành.

Cùng nhau viết story (brainstorming, mind map, example mapping) mang tới ba góc nhìn: **business** (cái gì có giá trị), **development** (cái gì làm được) và **testing** (làm sao biết nó chạy đúng).

Một story tốt đạt **INVEST**: Independent, Negotiable, Valuable, Estimable, Small và **Testable**. Nếu không ai nói được cách test một story, có lẽ story đó chưa rõ, không thực sự có giá trị, hoặc bên liên quan cần được hỗ trợ về kiểm thử.

## Acceptance criteria

**Acceptance criteria** là các điều kiện mà phần cài đặt phải đáp ứng để được chấp nhận. Chúng thường hình thành từ phần Conversation, và chúng chính là **test condition** của story. Chúng được dùng để xác định phạm vi, đạt đồng thuận, mô tả cả case positive lẫn negative, lập kế hoạch và ước lượng, và làm cơ sở cho acceptance testing.

Story: *Là người mua hàng, tôi muốn áp mã giảm giá khi thanh toán, để trả ít tiền hơn.*

**Dạng kịch bản** (scenario-oriented, Given / When / Then như trong BDD):

```gherkin
Given my basket total is 80 USD
When I apply the valid code SAVE10
Then the total becomes 72 USD
```

**Dạng quy tắc** (rule-oriented, một checklist hoặc một bảng input và output):

* Mã hợp lệ trừ phần trăm của nó khỏi tổng giỏ hàng.
* Mã hết hạn hoặc không tồn tại hiển thị "This code is not valid" và tổng tiền không đổi.
* Mỗi đơn hàng chỉ một mã.

Dạng nào cũng được, hoặc một dạng tự đặt, miễn là mọi criterion đều rõ ràng và không mơ hồ.

## ATDD: từ criteria đến test case

ATDD là cách tiếp cận test-first: test có trước khi làm story.

1. **Specification workshop.** Business, developer và tester cùng đi qua story và acceptance criteria, giải quyết chỗ thiếu và chỗ mơ hồ. ("Nếu mã làm tổng tiền xuống dưới 0 thì sao?" "Thành viên có được cộng mã với giảm giá thành viên không?")
2. **Viết test case**, cả nhóm hoặc tester, dựa trên acceptance criteria. Mỗi test là một **ví dụ** về cách phần mềm phải hoạt động, nên ở đây "ví dụ" và "test" là một. Các kỹ thuật test (EP, BVA, decision table…) giúp chọn giá trị.
3. **Thứ tự:** trước hết là test **positive** (mọi thứ diễn ra như mong đợi), rồi test **negative**, rồi các đặc tính **non-functional** (ví dụ: mã được áp dụng trong vòng một giây).

Test case cho story giảm giá:

| # | Given | When | Then |
|---|---|---|---|
| 1 | Giỏ 80 USD | Áp mã hợp lệ SAVE10 | Tổng 72 USD |
| 2 | Giỏ 80 USD | Áp mã hết hạn SUMMER24 | Thông báo "This code is not valid", tổng 80 USD |
| 3 | Giỏ 80 USD đã áp SAVE10 | Áp thêm một mã hợp lệ khác | Thông báo "Only one code per order", tổng 72 USD |
| 4 | Giỏ 80 USD | Áp " save10 " có khoảng trắng và chữ thường | (Hỏi trong workshop: có chấp nhận không?) |

Quy tắc cho test: viết bằng ngôn ngữ mà các bên liên quan hiểu (điều kiện trước, input, kết quả mong đợi); cover **mọi** đặc điểm của story nhưng **không vượt ra ngoài** story; và không để hai test mô tả cùng một đặc điểm. Test 4 là một câu hỏi, chưa phải test: nó cho thấy workshop đang làm đúng việc của mình.

Khi test được viết ở định dạng công cụ chạy được (như Gherkin), developer tự động hóa chúng trong lúc làm story, và acceptance test trở thành **requirement chạy được** (executable requirements).

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 4.5.1 "Collaborative user story writing", 4.5.2 "Acceptance criteria" và 4.5.3 "Acceptance test-driven development (ATDD)". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: một user story gồm Card, Conversation và Confirmation; acceptance criteria của nó, dạng kịch bản hay dạng quy tắc, chính là test condition. Trong ATDD, cả nhóm biến chúng thành ví dụ trước khi code: positive trước, rồi negative, rồi non-functional, cover trọn story và không vượt ra ngoài nó.
