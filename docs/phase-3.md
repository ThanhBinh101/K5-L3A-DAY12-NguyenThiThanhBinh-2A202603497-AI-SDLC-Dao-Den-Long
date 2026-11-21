# Phase 3 · Ticket-03 và Test Contract v1.2

## Quyết định thiết kế

Đèn sáng giờ có thời gian tồn tại. Trạng thái đèn tách phần đã góp, nhiên liệu và lịch sử đã từng sáng. Nhiên liệu dùng bước cố định để tránh phụ thuộc FPS. Cùng dữ liệu đầu vào phải tạo cùng đầu ra JSONL.

Sức chứa bắt đầu từ 10, tăng 2 theo lần thắp thành công và chặn ở 20. Đèn yếu khi nhiên liệu dưới 30, có thể bị Bóng Mực hút. Khi hết nhiên liệu, xóa phần góp và giữ `ever_lit`. Thắp lại cần 5 đom đóm. Thời gian đêm đổi thành 240/270/300 giây. Tới bình minh phải còn sáng ít nhất 60% số đèn, làm tròn lên. Xử lý hết lửa trước khi xét bình minh.

## Nghiệm thu và thay đổi test

| Ca | Kỳ vọng |
|---|---|
| Góp phần cuối giúp toàn bộ đèn sáng trước giờ | Ca từng kỳ vọng thắng ở v1.0/v1.1 nay kỳ vọng tiếp tục chơi. Kiểm `lantern_lit` có cờ `relight`. |
| Một đèn gần hết nhiên liệu | Đèn tắt ở tick thích hợp, phần đã góp về 0 và `ever_lit` vẫn đúng. |
| Tiếp nhiên liệu hoặc thắp lại | Mỗi đom đóm tiếp thêm 10 nhiên liệu, tối đa 100. Thắp lại tăng `relit_count` và điểm thắp lại. |
| Bình minh | Chạy một ca đạt ngưỡng và một ca dưới ngưỡng. So quy tắc điểm từng hành động và điểm bình minh. |
| Hồi quy | Chạy các ca đầu vào, nhặt, góp, bố cục và tạm dừng vẫn còn hiệu lực. |

Chạy `npm test` rồi `npm run verify` từ phiên bản tương ứng. [ADR](ADR-001.md) · [Test tự động](../tests/contract.test.mjs) · [Bằng chứng Phase 3](proof/phase-3/)

## Dùng AI và đánh giá

Codex giữ ca thắp đèn cuối và đổi kỳ vọng có điều kiện theo phiên bản. Cách này giúp phát hiện lẫn luật khi chạy ở tag cũ. Kiểm riêng mỗi thay đổi với ít vật thể để giảm chuỗi trạng thái phải đọc. Ước lượng 3.000–5.000 token văn bản cho ghi chú yêu cầu, thiết kế thay đổi và mã có liên quan, theo quy đổi khoảng bốn ký tự mỗi token.
