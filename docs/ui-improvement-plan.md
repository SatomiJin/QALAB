# Kế hoạch cải thiện UI: màu sắc và layout (desktop + mobile)

Trạng thái: **bước A xong (2026-10-02)**, kèm mục 2.1 (vì đó là cách sửa 1.1); các bước B–E chưa làm. Nguồn: review ngày 2026-10-02 dựa trên `npm run ui:review` (224 ảnh chụp, light/dark × EN/VI, desktop 1280px + mobile Pixel 7 412px) và đối chiếu với `docs/design.md`. Chưa có Figma: connector chưa nạp được trong phiên review (xem mục 6).

Ký hiệu: ✅ đã kiểm chứng lại · 🔎 thấy trên ảnh chụp, cần đo lại khi làm · ⚠️ đổi một quyết định đã ghi trong `docs/design.md`, cần bạn duyệt.

---

## 1. Lỗi cần sửa trước (P0)

| # | Vấn đề | Màn hình | Nguyên nhân / nơi sửa | |
|---|---|---|---|---|
| 1.1 | **Mọi trang admin tràn ngang trên mobile** (443–446px trong viewport 412px), nút menu ☰ bị cắt | Admin, mobile, cả 2 theme, cả 2 ngôn ngữ | Top bar admin chứa brand + "Admin" + Ngôn ngữ + Theme + Avatar + Menu, và brand có `flex-shrink: 0` (`layouts/AppShell.module.scss`) | ✅ **Đã sửa** |
| 1.2 | **Phép đo tràn ngang bị "mù" trên mobile**: `scrollWidth − innerWidth` luôn ra 0 khi giả lập mobile, nên Phase 8 báo sai là không có tràn | `ui-review/screens.ts`, test e2e "no horizontal scroll" | So với `page.viewportSize().width` thay vì `innerWidth`; thêm regression test cho admin mobile | ✅ **Đã sửa** |
| 1.3 | Trang sửa bài học/bài tập admin không đánh dấu mục nav hiện tại ("Courses" mất vạch highlighter) | Admin lesson/exercise | Route `/admin/lessons/*`, `/admin/exercises/*` không nằm dưới `/admin/courses`; dùng `isActive` tuỳ chỉnh cho NavLink | ✅ **Đã sửa** (`activePaths`) |

## 2. Layout mobile (< 768px) (P1)

1. **Top bar gọn lại**: chuyển Ngôn ngữ và Theme vào drawer, trên bar chỉ giữ brand, avatar và menu. Thay đổi này cũng sửa luôn 1.1. Dưới 400px chữ "QA Learning Lab" có thể rút gọn. ✅ **Đã làm ở bước A** (tên brand tự cắt bằng dấu … nếu thiếu chỗ).
2. **Vùng chạm ≥ 44–48px**:
   - Link trong drawer: `min-height: 48px`, padding 12px 16px.
   - Nút phân trang: 40px.
   - Lựa chọn đáp án: cả hàng bấm được, `min-height: 48px`, padding 12px, viền Rule, bo 4px. 🔎
3. **Nút primary rộng hết khung trên mobile** ở mọi màn hình. Hiện chỉ "Bắt đầu" là full width; Submit, Mark as complete và Try again thì không. 🔎
4. **Dòng meta khi xuống dòng**: dòng thứ hai bắt đầu bằng vạch `│` thụt vào. Bỏ vạch, chỉ dùng `gap` (column 16px, row 4px). Quy tắc thiết kế vốn đã cho phép "gaps or a 1px Rule". File: `Learning.module.scss:32-35`, `Dashboard.module.scss:40-43`. 🔎
5. **Bài học**: thanh dính đáy (56px) gồm "Mark as complete" và "Bài tiếp", hiện khi đã đọc 80%. Người học không phải cuộn ngược lên. ⚠️ (thêm một thành phần cố định)
6. **Dashboard quá dài trên điện thoại** (riêng phần Skills khoảng 650px):
   - Gộp các kỹ năng chưa bắt đầu thành một dòng muted ("Chưa bắt đầu: Testing Types, Test Design…").
   - "Needs retest" khi trống chỉ còn một câu. 🔎

## 3. Màu sắc (P2)

Mọi đề xuất giữ concept "ink on paper": màu bão hoà chỉ dành cho verdict và highlighter. Sau mỗi thay đổi màu phải chạy lại `accessibility.spec.ts`.

**Dark mode: thiếu chiều sâu** (ưu tiên trong nhóm này)

| Token | Hiện tại | Đề xuất | Lý do |
|---|---|---|---|
| Paper | `#12171D` | `#11161C` | Nền |
| Sheet | `#1A2129` | `#1B232C` | Card và input tách khỏi nền rõ hơn |
| **Sheet raised** (mới) | – | `#232C36` | Card khi hover, drawer, popover |
| Rule | `#2A333D` | `#34404C` | Viền card thấy được |
| Highlighter | `#E3C14F` | `#DDBB4C` | Đỡ chói trên mảng lớn; chữ Ink vẫn khoảng 9:1 |
| Blocked | `#E0A443` | `#E58A4E` | Hiện quá gần màu highlighter, Blocked dễ đọc nhầm là "làm tiếp" |

- **Avatar** đang là đĩa trắng (Ink), thứ sáng nhất màn hình và kéo mắt hơn cả highlighter. Đổi thành nền Sheet raised, chữ Ink, viền Rule. File: `features/auth/UserMenu.module.scss:7`. 🔎
- **Brand mark** là ô tối nên chìm trên nền tối. Thêm viền 1px `#34404C` hoặc làm phiên bản ô sáng. 🔎
- **Vạch Ink phía trên khối Continue** chỉ ở dark mode: chuyển sang Ink muted. 🔎

**Light mode: hơi phẳng**

| Token | Hiện tại | Đề xuất |
|---|---|---|
| Paper | `#F6F7F4` | `#F3F4EF` (ấm hơn, giống giấy hơn) |
| Rule | `#DDE1DC` | `#D6DBD4` (viền card thấy rõ hơn) |
| **Rule strong** (mới) | – | `#B9C0B8` cho đầu bảng và đầu section, thay cho Ink đậm |

Highlighter `#F4D35E` giữ nguyên.

**Verdict ở trang kết quả**: điểm số to bằng tiêu đề trang, nhưng verdict bên cạnh chỉ là tag 12px dùng chung với các hàng bảng. Thêm biến thể **tag lớn** (14/20, padding 4px 8px) cho phần đầu trang kết quả và trạng thái khoá học. Palette giữ nguyên. File: `features/practice/ResultView.tsx`.

## 4. Layout desktop (P3)

1. **Quy tắc kích thước nút**:
   - `large` chỉ cho một hành động "làm tiếp" của trang (Continue, Submit, Try again, Mark as complete).
   - Mọi nút lưu form dùng cỡ mặc định, kể cả admin.
   - Ghi quy tắc này vào `docs/design.md`. Hiện đang có ba cỡ, không theo quy tắc nào. 🔎
2. **Độ dài vạch kẻ trên trang bài tập**: form 720px, vạch dừng ở 840px, còn vạch "Các lần làm" chạy hết 1040px. Thống nhất mọi vạch section chạy hết cột. 🔎
3. **Dòng bài học trong khoá**: cột số 3.5em → 2.75em, gap 12px; số phút đưa vào dòng meta dưới tiêu đề. 🔎
4. **Thẻ "Luyện tập bài này"** trong bài học: tag Not run đang lơ lửng giữa thẻ, cần đẩy về mép phải. 🔎
5. ⚠️ **Cột phụ dính bên phải từ 1200px**:
   - Bài học: lưới `minmax(0, 68ch) 240px`, gap 48px; cột phụ chứa % đã đọc, Mark as complete và bài tiếp.
   - Bài tập và trang sửa admin: form 640px + panel 280px (trạng thái, các nút hành động, Lưu).
   - Lý do: ở 1280px trang đọc bài để trống khoảng 450px bên phải. Đổi quyết định "một cột đọc" trong design.md.
6. ⚠️ (tuỳ chọn) Nội dung top bar nằm trong khung 1200px ở giữa, để brand thẳng hàng với nội dung trên màn 1440–1920px. Phase trước đã chủ động bỏ cách này, nên chỉ làm nếu bạn muốn.
7. **Phân biệt khu admin**: hiện chỉ có chữ "Admin" nhỏ, rất dễ quên là mình đang sửa nội dung thật. Thêm dải 3px Rule strong dưới top bar, hoặc một "con dấu" Admin kiểu StatusTag (không dùng màu verdict).

## 5. Thứ tự làm đề xuất

| Bước | Nội dung | Ước lượng | Kiểm tra |
|---|---|---|---|
| A | P0: 1.1–1.3, sửa phép đo tràn ngang, regression test | nhỏ | `ui:review` không còn ảnh mobile rộng hơn 1082px; e2e tràn ngang chạy trên mobile admin |
| B | Mobile: mục 2.1–2.4 | vừa | ảnh mobile EN và VI; vùng chạm ≥ 44px |
| C | Màu dark + avatar + brand mark + tag lớn | vừa | `accessibility.spec.ts` dark; ảnh dark |
| D | Màu light, Rule strong, quy tắc nút, vạch kẻ, dòng khoá học | nhỏ | ảnh light; axe |
| E | ⚠️ mục 2.5, 4.5, 4.6, 4.7: chỉ làm sau khi bạn duyệt | lớn | review lại với Figma |

Mỗi bước: cập nhật `docs/design.md` và `.claude/rules/design.md`; nếu test lỗi thì chỉ chạy lại các test lỗi (`npm run test:e2e:failed`).

## 6. Dùng Figma ở đâu

Connector Figma chỉ được nạp khi một phiên Claude Code bắt đầu. Hãy mở phiên mới và nhờ `figma-reviewer`. Hai cách dùng:

1. **Trước bước C/E**: dựng trong Figma các frame "trước / sau" cho Dashboard, Bài học, Kết quả bài tập và Admin course (desktop + mobile, light + dark) với palette đề xuất ở mục 3, để bạn duyệt bằng mắt trước khi sửa code.
2. **Sau khi sửa**: `figma-reviewer` so ảnh chụp app với các frame đã duyệt.

## 7. Chưa được kiểm tra trong lần review này

- Drawer đang mở, menu, trạng thái hover và focus (bộ chụp không bắt được).
- Độ rộng 768–992px và trên 1280px.
- Một số tổ hợp: dark mobile ở exercise-result và admin; VI ở trang khoá học.
