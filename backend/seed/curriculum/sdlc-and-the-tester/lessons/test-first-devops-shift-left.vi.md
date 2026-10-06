Các nhóm hiện đại không đợi có bản build hoàn chỉnh rồi mới bắt đầu test. Test được viết trước code, chạy tự động mỗi khi có thay đổi, và chính quy trình làm việc cũng được "kiểm tra" qua các buổi retrospective định kỳ. Bài này nói về các cách tiếp cận **test-first** (TDD, ATDD, BDD), DevOps thay đổi gì với tester, cách **shift left**, và cách **retrospective** cải thiện việc kiểm thử của nhóm.

## Test-first: test dẫn dắt việc phát triển

Trong ba cách tiếp cận gần nhau này, test được định nghĩa *trước* code và định hướng cái sẽ được xây. Cả ba đều áp dụng nguyên tắc kiểm thử sớm, hợp với phát triển kiểu iterative, và test thường được giữ lại làm automated regression test về sau.

| Cách tiếp cận | Ai viết test | Dựa trên gì | Ví dụ |
|---|---|---|---|
| **TDD** (test-driven development) | Developer | Thiết kế của một đoạn code nhỏ | Viết một unit test fail cho `applyDiscount()`, viết code đến khi pass, rồi refactor |
| **ATDD** (acceptance test-driven development) | Cả nhóm cùng phía business | Acceptance criteria của story | Thống nhất acceptance test cho "miễn phí vận chuyển từ $50" trước khi làm story |
| **BDD** (behaviour-driven development) | Cả nhóm cùng phía business | Hành vi mong muốn, viết bằng ngôn ngữ thường | Một scenario Given / When / Then, sau đó được tự động hóa |

Một scenario BDD trông như sau, và các công cụ như Cucumber có thể chạy nó như một test:

```gherkin
Scenario: Free shipping at the threshold
  Given my basket total is $50.00
  When I go to checkout
  Then the shipping cost is $0.00
```

TDD đi theo một vòng ngắn: **red** (một test fail), **green** (viết vừa đủ code để pass), **refactor** (dọn code, có test làm lưới an toàn).

## DevOps và kiểm thử

**DevOps** đưa phát triển (gồm cả kiểm thử) và vận hành về chung mục tiêu. Nó dựa trên sự tự chủ của nhóm, phản hồi nhanh, chuỗi công cụ tích hợp và **continuous integration và continuous delivery (CI/CD)**: mỗi thay đổi được build, test và sẵn sàng release qua một **delivery pipeline** tự động.

```text
commit → build → static analysis → unit tests → API tests → deploy to staging → UI and regression tests → release
```

| Lợi ích cho kiểm thử | Rủi ro và chi phí |
|---|---|
| Phản hồi nhanh cho mỗi thay đổi | Pipeline phải được thiết kế và duy trì |
| CI thúc developer nộp code kèm component test và static analysis | Phải đưa vào và vận hành các công cụ CI/CD |
| Môi trường test ổn định, tự động | Test automation cần người và thời gian, và khó bảo trì |
| Thấy rõ hơn hiệu năng và độ tin cậy | |
| Ít test thủ công lặp lại, giảm rủi ro regression | |

Dù tự động hóa nhiều đến đâu, **vẫn cần test thủ công từ góc nhìn người dùng**: exploratory testing, usability, những thứ chưa ai nghĩ tới để tự động hóa.

## Shift left

**Shift left** là nguyên tắc kiểm thử sớm áp dụng cho cả vòng đời: test sớm hơn, nhưng không bỏ bê kiểm thử ở giai đoạn sau. Các cách làm:

* Review đặc tả và story từ góc nhìn tester (chỗ mơ hồ, thiếu sót, mâu thuẫn).
* Viết test case trước code, và chạy code trong test harness ngay khi đang viết (TDD, ATDD).
* Dùng CI, tốt hơn nữa là CD, để component test chạy theo mỗi commit.
* Chạy static analysis trên code trước dynamic testing, hoặc ngay trong pipeline.
* Bắt đầu non-functional testing (ví dụ performance) từ mức component thay vì đợi có cả hệ thống.

Shift left tốn công sức và đào tạo ở giai đoạn đầu nhưng tiết kiệm nhiều hơn về sau, và chỉ thành công khi các bên liên quan đồng ý đầu tư cho nó.

## Retrospective: cải thiện cách nhóm kiểm thử

**Retrospective** được tổ chức vào cuối một iteration, một bản release hay một dự án, hoặc khi cần. Mọi người liên quan (developer, tester, Product Owner, business analyst) cùng thảo luận:

1. Điều gì làm tốt và nên giữ lại?
2. Điều gì chưa tốt và có thể cải thiện?
3. Làm sao đưa cải tiến vào thực tế và giữ được những điều làm tốt?

Kết quả được ghi lại (thường trong test completion report) và quan trọng nhất là được **theo dõi thực hiện**: một cải tiến không ai làm thì chỉ là lời than phiền. Với kiểm thử, retrospective thường mang lại test hiệu quả hơn, testware tốt hơn, requirement tốt hơn, phối hợp giữa developer và tester tốt hơn, và một nhóm cùng nhau học hỏi.

Ví dụ: "Sprint này có ba bug đến từ quy tắc ngày tháng không rõ" → hành động: "mọi story có ngày tháng phải kèm ví dụ ở cuối tháng", người phụ trách: Product Owner, kiểm tra lại ở retrospective sau.

## Nguồn tham khảo

* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 2.1.3 "Testing as a driver for software development", 2.1.4 "DevOps and testing", 2.1.5 "Shift left" và 2.1.6 "Retrospectives and process improvement". © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus. Bài học này là phần giải thích do team QALAB tự biên soạn dựa trên syllabus, không phải bản sao của syllabus.

> Ý chính: trong TDD, ATDD và BDD, test có trước code và dẫn dắt nó; DevOps chạy các test đó tự động trong pipeline để có phản hồi nhanh; shift left đưa mọi loại kiểm thử lên sớm nhất có thể; và retrospective, khi được theo dõi thực hiện, liên tục cải thiện cách nhóm kiểm thử.
