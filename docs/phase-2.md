# Phase 2 · Ticket-02 và Test Contract v1.1

## Thay đổi cần giữ

Ticket-02 chốt thông số và thêm ba đêm. Kỳ vọng thắng ngay khi tất cả đèn sáng vẫn áp dụng. Các ca nhặt, góp từng phần, camera và chạy lặp từ Phase 1 tiếp tục chạy. [Khai báo contract](../game.contract.json)

- Đêm 1 có 5 đèn và 300 giây. Đêm 2 có 6 đèn và 330 giây. Đêm 3 có 7 đèn và 360 giây.
- Bản đồ đêm 2 có hai đảo và đoạn nối. Bản đồ đêm 3 có cao độ, đệm nhảy và gió. Scenario tắt nguồn sinh tự động và gió khi kiểm riêng va chạm hoặc thao tác.
- Di chuyển chuẩn hóa theo camera. Tốc độ đi 6, nhảy 7 và trọng lực −20. Lướt tốc độ 14 trong 0,2 giây với hồi chiêu 1,5 giây.
- Ticket nêu tên trường `invuln` mà không ghi kiểu. Bản này xuất Boolean cho trạng thái miễn nhiễm ở snapshot, giữ bộ đếm theo tick trong mô phỏng.
- Khi tạm dừng vẫn đếm tick đầu ra. Thời gian mô phỏng, vị trí và các bộ đếm đứng yên đến khi tiếp tục.

## Nghiệm thu

| Nhóm | Ca kiểm |
|---|---|
| Bố cục và schema | Kiểm số đèn từng đêm, các tọa độ đèn ở đêm 1 và các trường gió, vận tốc, hồi chiêu, bùa, đom đóm và Drifter. |
| Đầu vào | Giữ hướng giữa frame, đổi yaw, nhảy hoặc lướt theo cạnh nhấn. |
| Tạm dừng | Đưa nút tạm dừng lên ở tick 2 và tiếp tục ở tick 6. So wall tick, sim tick, thời gian và vị trí trước và trong lúc tạm dừng. |
| Tác nhân và mất lửa | Cô lập Bóng Mực, kiểm xung, miễn nhiễm, rơi đom đóm, mất lửa và hồi lại sau khi rơi. |
| Hồi quy | Thắp đèn cuối và so JSONL khi chạy lại với cùng đầu vào. |

Chạy `npm test` rồi `npm run verify` để lưu bằng chứng. [Test tự động](../tests/contract.test.mjs) · [Bằng chứng Phase 2](proof/phase-2/)

## Dùng AI và đánh giá

Codex giữ chung lõi game và mở rộng trạng thái theo phiên bản. Cách tiết kiệm là tái sử dụng bộ kiểm thử v1.0 và thêm ca riêng bằng scenario nhỏ. Các trường v1.1 phải đối chiếu đề gốc và test đầu ra thay vì đoán kiểu từ tên. Ước lượng 3.000–5.000 token văn bản cho phần đọc thay đổi, thiết kế các ca mới và phần mã có liên quan, dùng quy đổi thô khoảng bốn ký tự mỗi token.
