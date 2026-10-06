Phần lớn các nhóm QA bạn sẽ gia nhập theo dõi bug bằng **Jira** (của Atlassian). Những ý trong khóa này (các trường, vòng đời, kết cục triage) áp dụng thẳng vào đó; bài này cho thấy chúng nằm ở đâu trong Jira và cách tìm bug bằng **JQL**. Mỗi công ty cấu hình Jira một kiểu, nên hãy coi các tên dưới đây là mặc định và kiểm tra cấu hình của nhóm bạn.

## Từ vựng Jira

Atlassian đã đổi tên một số thứ trong Jira Cloud; đi làm bạn sẽ gặp cả hai tên.

| Hiện nay | Tên cũ | Ý nghĩa |
|---|---|---|
| Work item | Issue | Một đầu việc được theo dõi: story, task, bug |
| Work type | Issue type | Loại work item; **Bug** là một loại |
| Space | Project | Nơi chứa các work item của một nhóm, có key như `SHOP` (nên bug sẽ là `SHOP-142`) |
| Workflow | Workflow | Các trạng thái mà work item đi qua và các bước chuyển được phép |

## Từ bug report sang các trường của Jira

| Trường bug report (trong khóa này) | Nằm ở đâu trong Jira |
|---|---|
| Bug ID | Key tự sinh, như `SHOP-142` |
| Title | **Summary** |
| Environment, preconditions, các bước, actual và expected result | **Description** (nhiều nhóm dùng mẫu sẵn), đôi khi có trường **Environment** riêng |
| Priority | **Priority**: mặc định là Highest, High, Medium, Low, Lowest |
| Severity | Không có sẵn: các nhóm thêm custom field hoặc dùng label |
| Attachment | **Attachments**: ảnh chụp, video, log |
| Ai sửa | **Assignee**; bạn là **Reporter** |
| Mục liên quan | **Linked work items** (ví dụ *duplicates*, *blocks*, *relates to*) và story mà bug thuộc về |

Label và component giúp gom nhóm bug (`regression`, `checkout`). Nếu space của bạn dùng version, phiên bản phát hiện bug và phiên bản sửa bug cũng được ghi lại.

## Workflow và resolution

Một space mới thường bắt đầu với workflow đơn giản: **To Do → In Progress → Done**. Các nhóm thêm trạng thái cho khớp với vòng đời bug của mình, như *In Review*, *Ready for QA* hay *Reopened*. Mỗi trạng thái thuộc một trong ba **status category** (To Do, In Progress, Done), được board và báo cáo sử dụng.

Trường **resolution** cho biết work item kết thúc *như thế nào*. Mặc định có **Done**, **Won't do** và **Duplicate**; nhiều nhóm thêm *Cannot reproduce* hoặc *Not a bug*. Vì vậy các kết cục triage ở bài trước thường trở thành resolution, không phải trạng thái:

| Kết cục triage | Kết quả thường gặp trong Jira |
|---|---|
| Đã sửa và đã xác nhận | Status Done, resolution Done |
| Duplicate | Resolution Duplicate, link tới bug gốc |
| Won't Fix | Resolution Won't do, lý do ghi trong comment |
| Deferred | Vẫn mở, chuyển sang version hoặc sprint sau |

## Tìm bug bằng JQL

Basic search dùng các ô chọn; **advanced search** dùng **Jira Query Language (JQL)**. Một câu truy vấn gồm các mệnh đề (**field**, **operator**, **value** hoặc **function**), nối bằng **AND** / **OR**, và sắp xếp bằng **ORDER BY**:

```sql
issuetype = Bug AND resolution = Unresolved ORDER BY priority DESC, created ASC
```

Những truy vấn tester dùng hằng ngày:

```sql
issuetype = Bug AND reporter = currentUser() AND statusCategory != Done
project = SHOP AND issuetype = Bug AND labels = regression AND created >= -7d
project = SHOP AND issuetype = Bug AND priority in (Highest, High) AND resolution = Unresolved
```

Câu đầu liệt kê các bug của chính bạn còn đang mở; câu thứ hai, các bug regression trong tuần qua; câu thứ ba, các bug ưu tiên cao còn mở, thường là thứ được so với exit criteria đầu tiên. Lưu các truy vấn hữu ích thành **filter** và đặt lên dashboard cho cả nhóm.

## Thói quen tốt trong Jira

* Tìm trước khi tạo: một câu JQL với các từ trong summary thường tìm ra bug trùng.
* Mỗi work item một bug, link tới story hoặc test đã phát hiện ra nó.
* Tự chuyển trạng thái khi đến lượt bạn (retest, reopen) và thêm comment ghi build bạn đã dùng.
* Không dán secret, dữ liệu khách hàng thật hay mật khẩu vào work item: rất nhiều người đọc được nó.

## Nguồn tham khảo

* Atlassian Support, [What are work item statuses, priorities, and resolutions?](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-statuses-priorities-and-resolutions/), [What are work types?](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/) và [What is advanced search in Jira Cloud?](https://support.atlassian.com/jira-software-cloud/docs/what-is-advanced-search-in-jira-cloud/), kiểm tra ngày 6/10/2026. © Atlassian; tóm tắt bằng lời của team, không sao chép. Tên gọi và mặc định của Jira có thể thay đổi; hãy kiểm tra Jira của chính bạn.
* [ISTQB® Certified Tester Foundation Level syllabus v4.0.1](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) (2024), mục 5.5 "Defect management" (công cụ quản lý defect tự điền một số trường). © International Software Testing Qualifications Board (ISTQB®) và các tác giả syllabus.

> Ý chính: trong Jira, bug là một work item loại Bug trong một space; nội dung report nằm ở Summary, Description, Priority và attachments, severity thường cần custom field, workflow giữ vòng đời và resolution ghi lại kết cục. JQL (field, operator, value, AND/OR, ORDER BY) tìm ra những bug bạn cần.
