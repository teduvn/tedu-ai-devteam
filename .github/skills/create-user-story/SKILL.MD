# Kỹ năng: Tạo Jira User Story Ticket

## Mô tả

Kỹ năng này hướng dẫn bạn tạo một Jira user story ticket có cấu trúc tốt, theo chuẩn viết User Story của WeCheer Product Team.

Một user story tốt phải:
- Được viết từ **góc nhìn của khách hàng/người dùng** (không phải từ góc độ nội bộ hay kỹ thuật)
- Bao gồm **giả thuyết giá trị đo lường được** để câu chuyện có thể được ưu tiên
- Để ngỏ không gian cho đội kỹ thuật đề xuất giải pháp — tránh mô tả thiết kế kỹ thuật chi tiết
- Sử dụng **ngôn ngữ đơn giản, dễ hiểu** — không dùng thuật ngữ chuyên ngành hay viết tắt

---

## Cách sử dụng kỹ năng này

Cung cấp các thông tin sau và kỹ năng sẽ tạo ra bản nháp Jira ticket hoàn chỉnh:

1. **Người dùng là ai?** — Hãy cụ thể. Bao gồm ngữ cảnh: vai trò, thị trường, kênh, tình huống.
2. **Họ muốn làm gì?** — Công việc cần hoàn thành (JTBD). Mô tả hành động, không phải giải pháp.
3. **Tại sao họ muốn vậy?** — Mục tiêu hoặc lợi ích. Đây là phần quan trọng nhất.
4. **Tình trạng hiện tại là gì?** — Người dùng giải quyết vấn đề này như thế nào ngày nay?
5. **Tác động đo lường được là gì?** — Chọn 1 chỉ số chính: $, %, tỉ lệ chuyển đổi, NPS, thời gian tiết kiệm…
6. **Mục tiêu chiến lược / OKR nào liên quan?**
7. **Ý tưởng giải pháp** — Ít nhất 2 lựa chọn tổng quan (nghĩ theo MVP / thử nghiệm vs tính năng đầy đủ).
8. **Tiêu chí chấp nhận** (tùy chọn) — Khi nào story được coi là "hoàn thành"?

---

## Quy ước đặt tên người dùng

Sử dụng các loại người dùng cụ thể, thực tế. Tránh viết "Với tư cách là product owner…" trừ khi câu chuyện thực sự về công cụ nội bộ.

**Khách hàng (làm việc tại doanh nghiệp CPG)**
- Trưởng nhóm Thương mại (Trade Manager)
- Trưởng nhóm Marketing (Marketing Manager)
- Trưởng nhóm Kinh doanh (Commercial Manager)

**Nhân viên (làm việc trong Bán lẻ / Bán sỉ / Chuỗi cung ứng)**
- Thu ngân (Cashier)
- Quản lý cửa hàng (Store Manager)
- Nhà bán sỉ (Wholesaler)

**Người tiêu dùng (mua hàng CPG tại siêu thị, quán bar, café, trực tuyến…)**
- Người mua sắm siêu thị (Supermarket Shopper)
- Khách ghé café (Café Visitor)

---

## Mẫu User Story

```
## User Story

Là một [loại người dùng cụ thể] [trong ngữ cảnh/tình huống],
Tôi muốn [thực hiện một hành động nào đó],
để [tôi có thể đạt được mục tiêu hoặc lợi ích cụ thể].

---

## Bối cảnh / Vấn đề

> Mô tả tình trạng hiện tại. Người dùng giải quyết vấn đề này như thế nào ngày nay?
> Những điểm đau, ma sát hoặc khoảng trống nào đang tồn tại?

[Mô tả tình trạng hiện tại ở đây]

---

## Giả thuyết Giá trị

> Chọn 1 thước đo tác động chính. Ước tính giá trị đo lường được kèm lý do.
> Bao gồm Phạm vi ảnh hưởng (bao nhiêu người dùng bị ảnh hưởng?) và Tác động (điều gì thay đổi với họ?).

- **Chỉ số chính:** [vd: tỉ lệ chuyển đổi / doanh thu / thời gian tiết kiệm / NPS]
- **Giá trị ước tính:** [vd: +5% chuyển đổi → ~$50K ARR dựa trên X khách hàng đang hoạt động]
- **Phạm vi ảnh hưởng:** [vd: ảnh hưởng ~200 Trade Manager tại thị trường MX và BR]
- **Gắn kết chiến lược:** [vd: OKR: Tăng Người dùng Hoạt động Q2 | North Star: Chiến dịch Hoạt động hàng tháng]

---

## Giải pháp Đề xuất

> Cung cấp ít nhất 2 ý tưởng giải pháp tổng quan.
> Nghĩ theo: lựa chọn đơn giản/MVP, cách tiếp cận thử nghiệm, so với tính năng đầy đủ.
> KHÔNG viết thiết kế kỹ thuật chi tiết ở đây — để không gian cho đội kỹ thuật.

1. **Lựa chọn A (MVP / Giải pháp nhanh):** [Mô tả ngắn]
2. **Lựa chọn B (Tính năng đầy đủ):** [Mô tả ngắn]
3. *(Tùy chọn)* **Lựa chọn C (Thử nghiệm):** [Mô tả ngắn]

---

## Tài liệu hỗ trợ (Tùy chọn nhưng được khuyến khích)

- [ ] Sơ đồ luồng khách hàng / hành trình người dùng
- [ ] Thiết kế UI/UX, wireframe hoặc phác thảo sơ bộ
- [ ] Ảnh chụp màn hình hoặc ví dụ thực tế từ sản phẩm khác
- [ ] Ví dụ khách hàng bị ảnh hưởng nhiều nhất bởi vấn đề này
- [ ] Phản hồi trực tiếp từ khách hàng hoặc câu chuyện khi mọi thứ xảy ra sự cố

---

## Tiêu chí Chấp nhận (Tùy chọn)

> Xác định các điều kiện phải được đáp ứng để câu chuyện được coi là hoàn chỉnh.

- [ ] Khi [ngữ cảnh], khi [hành động], thì [kết quả mong đợi]
- [ ] ...
```

---

## ✅ Thực hành Tốt

- Viết từ **góc nhìn của người dùng**, không phải của đội phát triển
- Cụ thể về **người dùng là ai** (vai trò + thị trường/kênh/ngữ cảnh)
- Tập trung vào **"để"** — lý do tại sao là phần quan trọng nhất
- Chọn **một chỉ số đo lường được** cho giả thuyết giá trị
- Đề xuất **nhiều lựa chọn giải pháp** — để đội kỹ thuật quyết định cách tiếp cận tốt nhất
- Đưa vào **hình ảnh minh họa, ví dụ thực tế và phản hồi trực tiếp** bất cứ khi nào có thể

## ❌ Lỗi Thường Gặp Cần Tránh

- Viết "Với tư cách là product owner..." cho các story hướng đến khách hàng
- Mô tả giải pháp kỹ thuật chi tiết (vd: "triển khai API endpoint để...")
- Đưa vào quá nhiều thước đo giá trị hoặc công thức KPI quá phức tạp
- Sử dụng thuật ngữ chuyên ngành, từ viết tắt hoặc thuật ngữ nội bộ không có giải thích
- Để mệnh đề "để" mơ hồ hoặc thiếu hoàn toàn

---

## Ví dụ

```
## User Story

Là một Trade Manager tại công ty CPG ở Việt Nam,
Tôi muốn xem tổng quan hiệu suất chiến dịch đang hoạt động theo thời gian thực trên một màn hình duy nhất,
để tôi có thể nhanh chóng quyết định chiến dịch nào cần đẩy mạnh hoặc tạm dừng mà không phải chuyển đổi giữa nhiều báo cáo.

---

## Bối cảnh / Vấn đề

Hiện tại, các Trade Manager phải xuất dữ liệu từ 3 màn hình riêng biệt và tổng hợp thủ công
báo cáo Excel mỗi tuần. Việc này mất ~3 giờ/người/tuần và thường dẫn đến
quyết định chậm trễ. Các chiến dịch đôi khi chạy quá thời điểm tối ưu do thiếu tầm nhìn.

---

## Giả thuyết Giá trị

- **Chỉ số chính:** Thời gian ra quyết định chiến dịch
- **Giá trị ước tính:** Giảm công việc báo cáo hàng tuần ~3 giờ/người → tiết kiệm ~$15K/năm
  cho 20 Trade Manager đang hoạt động tại VN
- **Phạm vi ảnh hưởng:** ~20 Trade Manager tại thị trường VN (có thể mở rộng sang TH: ~35 người dùng)
- **Gắn kết chiến lược:** OKR: Cải thiện Giữ chân Khách hàng Q2 | North Star: Chiến dịch Hoạt động hàng tháng

---

## Giải pháp Đề xuất

1. **Lựa chọn A (MVP):** Thêm widget tổng hợp vào trang Danh sách Chiến dịch hiện có, hiển thị
   top 5 KPI (lượt hiển thị, nhấp chuột, đổi thưởng, chi tiêu, ROI) với tần suất làm mới 24h.
2. **Lựa chọn B (Tính năng đầy đủ):** Xây dựng Dashboard Hiệu suất Chiến dịch chuyên dụng với
   dữ liệu thời gian thực, bộ lọc theo ngày/khu vực/sản phẩm và khả năng xuất báo cáo.
3. **Lựa chọn C (Thử nghiệm):** Gửi bản tóm tắt tự động hàng ngày qua Zalo/email
   tóm tắt top 3 chiến dịch theo hiệu suất cho mỗi Trade Manager.

---

## Tiêu chí Chấp nhận

- [ ] Khi tôi đang ở dashboard, khi tôi mở nó, thì tôi thấy dữ liệu hiệu suất được làm mới trong vòng 24 giờ qua
- [ ] Khi tôi có nhiều chiến dịch đang hoạt động, khi tôi xem tổng quan, thì tôi có thể thấy ít nhất: lượt hiển thị, nhấp chuột, đổi thưởng, chi tiêu
- [ ] Khi tôi là Trade Manager tại VN, khi tôi đăng nhập, thì tôi chỉ thấy các chiến dịch được gán cho tài khoản của mình
```
