Các kỹ thuật trước đây thiết kế test từ requirement. **Kỹ thuật white-box** thiết kế test từ chính code, và đo xem test thực sự chạy qua bao nhiêu phần của code đó. Là QA engineer, bạn hiếm khi tự viết các test này, nhưng bạn sẽ đọc báo cáo coverage và trao đổi với developer về nó, nên cần hiểu các con số có nghĩa gì, và không có nghĩa gì.

## Đoạn code ví dụ

Một cửa hàng tính phí vận chuyển 5 USD. Thành viên được miễn phí, đơn từ 50 USD trở lên cũng vậy.

```ts
function shippingCost(total: number, isMember: boolean): number {
  let cost = 5;
  if (isMember) {
    cost = 0;
  }
  if (total >= 50) {
    cost = 0;
  }
  return cost;
}
```

Hàm này có sáu câu lệnh thực thi được (`let cost = 5`, hai lệnh `if`, hai lệnh `cost = 0`, và `return cost`, ở đây tính mỗi `if` là một câu lệnh) và hai quyết định (decision), mỗi quyết định có kết quả **true** và **false**.

## Statement testing

Trong **statement testing**, coverage item là các câu lệnh thực thi được:

> Statement coverage = số câu lệnh test đã chạy qua ÷ tổng số câu lệnh thực thi được

Ở đây một test là đủ đạt 100 %: `shippingCost(60, true)` đi vào cả hai khối `if` và chạy mọi dòng.

Statement coverage 100 % nghĩa là mọi dòng đã chạy ít nhất một lần, nên defect nằm ở dòng nào cũng đã có cơ hội gây ra failure. Nó **không** có nghĩa là mọi quyết định đã được test: test trên chưa bao giờ đi theo nhánh mà `if` là **false**. Nó cũng bỏ sót defect phụ thuộc dữ liệu, như phép chia chỉ lỗi khi số chia bằng 0.

## Branch testing

**Branch** (nhánh) là một lần chuyển điều khiển từ điểm này sang điểm khác trong code: không điều kiện (code chạy thẳng) hoặc có điều kiện (kết quả true hay false của một `if`, một `case` của `switch`, ở lại hay thoát khỏi vòng lặp). Trong **branch testing**, coverage item là các branch:

> Branch coverage = số branch test đã chạy qua ÷ tổng số branch

Chỉ với `shippingCost(60, true)`, cả hai quyết định mới đi theo hướng **true**. Thêm `shippingCost(20, false)` thì cả hai đi theo hướng **false**:

| Test | Quyết định `isMember` | Quyết định `total >= 50` | Kết quả |
|---|---|---|---|
| `(60, true)` | true | true | 0 |
| `(20, false)` | false | false | 5 |

Giờ hai test đã cover mọi kết quả của mọi quyết định: branch coverage 100 %.

**Branch coverage bao hàm statement coverage**: branch coverage 100 % luôn kéo theo statement coverage 100 %, nhưng điều ngược lại thì không, như test đầu tiên đã cho thấy.

## Coverage không nói được gì

Giả sử developer viết `total > 50`. Cả hai test ở trên vẫn pass và branch coverage vẫn 100 %, nhưng đơn hàng đúng 50.00 USD vẫn bị tính phí vận chuyển. Chỉ một test **boundary value** (50.00) mới tìm ra. Và nếu requirement còn nói "sinh viên được miễn phí vận chuyển" mà không ai code phần đó, không con số coverage nào cho thấy được phần code bị thiếu: white-box testing không tìm được **defect do bỏ sót** (defect of omission).

Vì vậy coverage là công cụ để tìm **code chưa được test**, không phải bằng chứng về chất lượng. "Branch coverage 80 %" cho biết 20 % số branch chưa từng chạy; nó không nói gì về việc 80 % còn lại có được so với đúng kết quả mong đợi hay không.

## Giá trị của white-box testing

* Nó xét **toàn bộ phần cài đặt**, nên tìm được defect ngay cả khi đặc tả mơ hồ, lỗi thời hoặc thiếu.
* Nó cho một **thước đo khách quan** về những gì test đã chạy qua. Riêng black-box testing không đo được code coverage.
* Nó chỉ ra chỗ cần **thêm test**: báo cáo coverage tô sáng những dòng và branch chưa từng chạy.
* Nó dùng được cả trong **static testing**: tự dò từng bước qua code hoặc pseudocode ("dry run") trước khi chạy được.

Trong thực tế, công cụ unit test tạo ra báo cáo (ví dụ `vitest --coverage`, Jest, JaCoCo, coverage.py). Một câu hỏi hữu ích của tester khi review code: "Những branch nào của thay đổi này chưa được cover, và có branch nào rủi ro không?"

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 4.3.1 "Statement testing and statement coverage", 4.3.2 "Branch testing and branch coverage" và 4.3.3 "The value of white-box testing". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: statement coverage đếm các dòng test đã chạy, branch coverage đếm các kết quả của quyết định, và branch coverage 100 % bao gồm statement coverage 100 %. Coverage chỉ ra code chưa được test; nó không tìm được biên sai hay requirement bị thiếu, nên hãy kết hợp với các kỹ thuật black-box.
