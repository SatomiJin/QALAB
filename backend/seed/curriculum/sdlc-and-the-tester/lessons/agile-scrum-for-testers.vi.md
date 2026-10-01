Phần lớn các nhóm bạn sẽ tham gia đều làm việc theo kiểu **Agile**: giao từng phần nhỏ phần mềm chạy được một cách thường xuyên, trao đổi nhiều hơn viết tài liệu, và coi việc requirement thay đổi là chuyện bình thường. **Scrum** là framework Agile phổ biến nhất. Bài này trình bày những gì tester cần biết để làm việc trong một nhóm Scrum.

## Scrum trong một trang

Scrum tổ chức công việc theo **sprint**: những khoảng thời gian cố định, thường là hai tuần, mỗi sprint kết thúc bằng một phần sản phẩm (increment) dùng được.

| Thành phần | Là gì | Vì sao tester cần quan tâm |
|---|---|---|
| Product Owner | Sở hữu product backlog và quyết định độ ưu tiên | Người để hỏi một story thực sự có nghĩa là gì |
| Developers | Tất cả những người xây dựng increment, kể cả tester | Kiểm thử là việc của cả nhóm, không phải một phòng ban riêng |
| Scrum Master | Hướng dẫn nhóm và gỡ bỏ trở ngại | Báo các vướng mắc như môi trường test bị hỏng |
| Product backlog | Danh sách có thứ tự mọi thứ sản phẩm có thể cần | Các story cần review trước khi vào sprint |
| Sprint planning | Nhóm chọn story cho sprint | Ước lượng công sức test, chỉ ra story có rủi ro |
| Daily Scrum | Buổi đồng bộ 15 phút mỗi ngày | Chia sẻ cái gì đã test, cái gì đang bị chặn |
| Sprint review | Increment được trình bày cho stakeholder | Cho thấy cái gì đã test, cái gì đã biết là chưa chạy đúng |
| Retrospective | Nhóm cải tiến cách làm việc | Đề xuất cải tiến quy trình, ví dụ "story cần có ví dụ" |

Trong Scrum, vai trò chính thức là "Developers": tester là một developer chuyên về kiểm thử. Không ai "ném code qua tường" cho một đội QA ở cuối cả.

## User story

Công việc được mô tả bằng **user story**, những câu ngắn nói về giá trị từ góc nhìn người dùng:

```text
As a returning customer,
I want to save my card details,
so that I can pay faster next time.
```

Một story không phải là bản đặc tả đầy đủ. Nó là lời hẹn cho một cuộc trao đổi, và tester là một trong những người nên tham gia cuộc trao đổi đó, hỏi "nếu... thì sao?" trước khi ai đó viết code.

## Acceptance criteria

**Acceptance criteria** (tiêu chí chấp nhận) là những điều kiện một story cụ thể phải đạt để Product Owner chấp nhận. Chúng biến story thành thứ có thể test được. Một định dạng phổ biến là **Given / When / Then**:

```text
Given I am logged in and have a saved card
When I open the payment page
Then the saved card is selected by default
And only the last 4 digits are shown
```

Acceptance criteria tốt thì cụ thể và kiểm tra được. Mỗi tiêu chí thường trở thành ít nhất một test case, cộng thêm các case negative mà tiêu chí ngầm định (thẻ đã lưu bị hết hạn, người dùng chưa lưu thẻ nào).

## Definition of Done

**Definition of Done (DoD)** là một checklist cả nhóm thống nhất, áp dụng cho **mọi** story, ví dụ:

* Code đã được review và merge.
* Unit test đã viết và pass.
* Acceptance criteria đã được test và pass.
* Không còn bug critical hay major nào đang mở cho story.
* Regression suite xanh.

| | Acceptance criteria | Definition of Done |
|---|---|---|
| Phạm vi | Một story | Mọi story |
| Ai viết | Product Owner cùng nhóm | Cả nhóm |
| Trả lời câu hỏi | Nó có làm đúng việc không? | Nó đã hoàn thành theo chuẩn chất lượng của nhóm chưa? |

Một story chỉ được coi là done khi đạt **cả hai**.

## Tester trong suốt sprint

* **Backlog refinement:** review story, đặt câu hỏi, đề xuất acceptance criteria và ví dụ.
* **Sprint planning:** tính cả công sức test vào ước lượng; story không thể test xong trong sprint là story chưa sẵn sàng.
* **Trong sprint:** test mỗi story ngay khi nó sẵn sàng, không dồn tất cả vào ngày cuối; làm cặp với developer; tự động hoá các kiểm tra regression.
* **Sprint review và retrospective:** báo cáo chất lượng một cách trung thực và đề xuất cải tiến quy trình.

## Shift-left

**Shift-left** nghĩa là đưa các hoạt động kiểm thử lên sớm hơn, dịch sang bên trái trên trục thời gian: review story khi refinement, thống nhất ví dụ trước khi code, developer viết unit test, test liên tục từng phần nhỏ. Đây là cách áp dụng nguyên tắc kiểm thử sớm bạn đã học ở khoá trước: một câu hỏi đặt ra khi refinement tốn vài phút, còn cùng bug đó nếu phát hiện sau release có thể tốn vài ngày.

> Ý chính: trong Scrum, tester là một phần của nhóm ngay từ cuộc trao đổi đầu tiên về một story. Acceptance criteria nói một story phải làm gì, Definition of Done nói mọi story cần gì để được coi là xong, và shift-left đưa việc kiểm thử lên sớm nhất có thể.
