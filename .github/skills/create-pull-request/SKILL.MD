name: create-pull-request
description: Trích xuất các thay đổi code và commit message để tạo nội dung Pull Request theo mẫu chuẩn của WeCheer.


# Hướng dẫn Kỹ năng Tạo Pull Request

Khi người dùng yêu cầu tạo Pull Request hoặc soạn thảo nội dung PR, thực hiện các bước sau:

1. **Thu thập Thông tin:**
   - Quét các commit message và file đã thay đổi (diff) trong nhánh hiện tại.
   - Tìm kiếm mã Jira ticket (vd: WEE-123) trong tên nhánh hoặc commit message.
   - Đối với tiêu đề PR:
      - Nếu tên nhánh chứa Jira ticket (vd: WEE-123), đặt tiêu đề PR là `[Jira Ticket ID]: [Tóm tắt]`.
      - Nếu không tìm thấy Jira ticket, đặt tiêu đề PR là `[Tóm tắt]` (không dùng tiền tố 'Jira ticket:').

2. **Tạo Nội dung:**
   - Luôn trình bày bằng **tiếng Việt** theo định dạng dưới đây.
   - Phần "Những gì tôi đã thay đổi" phải dựa trên phân tích logic code thực tế, không bịa đặt.



## Mẫu Pull Request

**Tiêu đề:**
`[Jira Ticket ID]: [Tóm tắt]` (nếu tên nhánh chứa Jira ticket)
`[Tóm tắt]` (nếu tên nhánh không chứa Jira ticket)

### Mô tả:
Vui lòng cung cấp mô tả rõ ràng và súc tích về vấn đề hoặc tính năng được đề cập trong pull request này. Thêm ngữ cảnh hoặc thông tin nền tảng nếu cần.

### Những gì tôi đã thay đổi:
*Mô tả chi tiết các thay đổi được thực hiện trong pull request này. Có thể bao gồm thay đổi code, cập nhật cấu hình hoặc các sửa đổi khác.*

* **Tổng quan cấp cao:** [Agent: Tóm tắt các thay đổi quan trọng nhất và liệt kê các file chính].
* **Chi tiết kỹ thuật:** [Agent: Đề cập các thay đổi trong logic, thuật toán hoặc các cân nhắc kỹ thuật cho người review].
* **Đoạn code tiêu biểu:** [Agent: Trích dẫn các đoạn code quan trọng nhất nếu có thay đổi lớn].

### Thay đổi Cấu hình (nếu có):
*Liệt kê bất kỳ thay đổi cấu hình nào cần được thực hiện hoặc cập nhật (vd: file JSON, biến môi trường).*

### Bằng chứng (Ảnh chụp màn hình hoặc Log):
*Bao gồm ảnh chụp màn hình, output log hoặc bằng chứng nào khác giúp minh họa và xác minh các thay đổi.*
*(Lưu ý: Yêu cầu nhập liệu thủ công từ lập trình viên)*

### Chỉ số thành công của kết quả:
Cách đo lường sự thành công của tính năng thông qua các sự kiện được tạo ra.

### Ghi chú Thêm:
Bất kỳ thông tin bổ sung, thách thức tiềm ẩn, đánh đổi hoặc các bước kiểm thử nào mà người review cần biết.


## Tham khảo Commit Message Chuẩn:
Khi đề xuất hoặc review commit, ưu tiên các định dạng sau:
- đổi tên tham số
- cập nhật tracking id
- cập nhật tham số short link
- sửa unit test

*Phần này nên là danh sách tất cả các commit message có trong thay đổi hiện tại. Trích xuất và hiển thị từng commit message từ nhánh đang được merge.*